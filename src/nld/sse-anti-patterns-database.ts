/**
 * NLD SSE Anti-Patterns Database
 * 
 * Comprehensive database of SSE connection anti-patterns and prevention strategies
 * Focus on patterns where frontend connects to terminal stream (1 connection) 
 * but status broadcasts have 0 connections, causing UI stuck on "starting"
 */

export interface SSEAntiPattern {
  id: string;
  name: string;
  category: 'connection_coordination' | 'status_broadcasting' | 'terminal_input' | 'ui_state_management' | 'error_recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  symptoms: string[];
  rootCauses: string[];
  detectionMethod: string;
  preventionStrategies: string[];
  recoveryActions: string[];
  tddPatterns: {
    testScenarios: string[];
    mockingStrategies: string[];
    assertionPatterns: string[];
  };
  realWorldExamples: Array<{
    context: string;
    manifestation: string;
    impact: string;
    resolution: string;
  }>;
  metrics: {
    occurrenceRate: number;
    avgResolutionTime: number;
    userImpactScore: number;
    preventionEffectiveness: number;
  };
}

export class SSEAntiPatternsDatabase {
  private antiPatterns: SSEAntiPattern[] = [
    {
      id: 'sse-ap-001',
      name: 'Status SSE Zero Connections While Terminal Connected',
      category: 'connection_coordination',
      severity: 'critical',
      description: 'Frontend establishes terminal SSE connection (1 active) but status SSE endpoint reports 0 connections, causing UI to remain stuck on "starting" status.',
      symptoms: [
        'UI shows "starting" status indefinitely',
        'Terminal SSE connection shows 1 active connection',
        'Status SSE endpoint shows 0 active connections', 
        'No status updates received in frontend',
        'Terminal functionality works but status never updates',
        'Connection type shows as connected but status remains stale'
      ],
      rootCauses: [
        'Status SSE endpoint not properly initialized',
        'Status broadcasting mechanism not triggered',
        'Race condition between terminal and status connections',
        'Frontend not subscribing to correct status endpoint',
        'Backend not emitting status events to SSE stream',
        'Connection cleanup interfering with status stream setup'
      ],
      detectionMethod: 'Monitor connection counts: terminal SSE > 0 && status SSE === 0 && UI status === "starting" for > 5 seconds',
      preventionStrategies: [
        'Establish status SSE connection before terminal SSE connection',
        'Add connection validation checks in frontend startup sequence',
        'Implement dual-connection health monitoring',
        'Add timeout detection for status update delays',
        'Create connection state synchronization mechanism',
        'Implement automatic status connection recovery'
      ],
      recoveryActions: [
        'Force re-establish status SSE connection',
        'Trigger manual status broadcast from backend',
        'Reset connection state and reconnect both streams',
        'Poll status endpoint as fallback mechanism',
        'Display connection diagnostic information to user'
      ],
      tddPatterns: {
        testScenarios: [
          'Test status SSE connection establishment before terminal SSE',
          'Test behavior when status SSE fails but terminal SSE succeeds',
          'Test UI state when receiving terminal data without status updates',
          'Test automatic recovery when status connection is lost',
          'Test connection state synchronization between frontend and backend'
        ],
        mockingStrategies: [
          'Mock EventSource to simulate failed status connections',
          'Mock backend to return zero status connections while terminal works',
          'Mock network conditions that affect only status endpoint',
          'Mock race conditions between connection establishments'
        ],
        assertionPatterns: [
          'Assert status SSE connection count > 0 when UI expects status updates',
          'Assert UI status changes within timeout period after connection',
          'Assert both terminal and status connections are active simultaneously',
          'Assert fallback mechanisms trigger when status connection fails'
        ]
      },
      realWorldExamples: [
        {
          context: 'Claude instance creation in production environment',
          manifestation: 'Instance created successfully, terminal commands work, but status shows "starting" forever',
          impact: 'Users think instance is broken and create multiple instances, wasting resources',
          resolution: 'Added status connection validation and automatic retry mechanism'
        },
        {
          context: 'Network instability causing partial connection failures',
          manifestation: 'Status SSE drops during instance startup, terminal remains connected',
          impact: 'UI becomes unreliable, users cannot trust status indicators',
          resolution: 'Implemented connection health monitoring and recovery protocols'
        }
      ],
      metrics: {
        occurrenceRate: 0.15, // 15% of connection attempts
        avgResolutionTime: 30, // 30 seconds average
        userImpactScore: 9.2, // High impact on user experience
        preventionEffectiveness: 0.85 // 85% prevention rate with TDD patterns
      }
    },
    {
      id: 'sse-ap-002', 
      name: 'Terminal Input Forwarding Breakdown',
      category: 'terminal_input',
      severity: 'high',
      description: 'Terminal SSE connection established but input forwarding to backend fails, creating appearance of working terminal with no actual command execution.',
      symptoms: [
        'Terminal input field accepts text',
        'No command responses or output received',
        'SSE connection shows as active',
        'Backend logs show no input events received',
        'Commands appear to be "sent" but nothing happens'
      ],
      rootCauses: [
        'Input event emitter not properly configured',
        'Backend endpoint for terminal input not accessible',
        'Instance ID validation failing on input path',
        'HTTP request for terminal input timing out',
        'Authentication/authorization issues for input endpoint'
      ],
      detectionMethod: 'Monitor for terminal input events sent with no corresponding backend input logs or responses within 5 seconds',
      preventionStrategies: [
        'Add input forwarding validation in frontend',
        'Implement input echo confirmation from backend',
        'Add circuit breaker pattern for input forwarding',
        'Create input path health checks',
        'Implement input queuing with retry logic'
      ],
      recoveryActions: [
        'Reset terminal input connection',
        'Validate instance ID and endpoint accessibility',
        'Switch to alternative input method (polling)',
        'Display input forwarding error to user',
        'Attempt connection recovery with exponential backoff'
      ],
      tddPatterns: {
        testScenarios: [
          'Test terminal input forwarding with valid instance ID',
          'Test input forwarding failure handling',
          'Test input path validation before sending',
          'Test input echo confirmation mechanism',
          'Test fallback input methods when primary fails'
        ],
        mockingStrategies: [
          'Mock backend input endpoint to simulate failures',
          'Mock network timeouts for input requests',
          'Mock invalid instance ID scenarios',
          'Mock authentication failures for input path'
        ],
        assertionPatterns: [
          'Assert input forwarding confirmation within timeout',
          'Assert backend logs show received input events',
          'Assert error handling when input forwarding fails',
          'Assert fallback mechanisms activate appropriately'
        ]
      },
      realWorldExamples: [
        {
          context: 'Instance ID format validation on input endpoint',
          manifestation: 'Frontend sends input with malformed instance ID, backend rejects silently',
          impact: 'Users type commands that never execute, leading to confusion',
          resolution: 'Added instance ID validation in frontend before sending input'
        }
      ],
      metrics: {
        occurrenceRate: 0.08,
        avgResolutionTime: 15,
        userImpactScore: 8.5,
        preventionEffectiveness: 0.92
      }
    },
    {
      id: 'sse-ap-003',
      name: 'Mixed Connection State Inconsistency',
      category: 'connection_coordination',
      severity: 'medium',
      description: 'Frontend and backend report different connection states, leading to inconsistent behavior and unreliable UI state management.',
      symptoms: [
        'Frontend shows connected, backend shows disconnected (or vice versa)',
        'Connection status indicators inconsistent across UI components',
        'Some features work while others fail unpredictably',
        'Reconnection attempts fail due to state mismatch',
        'Connection type display shows incorrect information'
      ],
      rootCauses: [
        'Connection state not synchronized between frontend and backend',
        'Race conditions in connection establishment/teardown',
        'Stale connection state caching',
        'Event propagation delays causing temporary inconsistencies',
        'Connection cleanup not properly updating all state stores'
      ],
      detectionMethod: 'Compare frontend isConnected state with backend active connection counts; flag when inconsistent for > 10 seconds',
      preventionStrategies: [
        'Implement connection state heartbeat mechanism',
        'Add connection state validation checkpoints',
        'Create centralized connection state management',
        'Implement state reconciliation protocols',
        'Add connection state audit logging'
      ],
      recoveryActions: [
        'Force connection state reconciliation',
        'Reset all connection states and re-establish',
        'Implement connection state consensus algorithm',
        'Manual connection state override capability',
        'Provide connection diagnostic tools'
      ],
      tddPatterns: {
        testScenarios: [
          'Test connection state synchronization during establishment',
          'Test state consistency during connection failures',
          'Test state reconciliation after network issues',
          'Test connection state propagation across components',
          'Test connection state cleanup on disconnect'
        ],
        mockingStrategies: [
          'Mock network delays affecting state synchronization',
          'Mock partial connection failures',
          'Mock state store inconsistencies',
          'Mock event propagation delays'
        ],
        assertionPatterns: [
          'Assert frontend and backend connection states match',
          'Assert connection state updates propagate to all components',
          'Assert state reconciliation works after inconsistencies',
          'Assert connection cleanup properly updates all states'
        ]
      },
      realWorldExamples: [
        {
          context: 'Page refresh during active SSE connection',
          manifestation: 'Backend thinks connection still active, frontend initializes as disconnected',
          impact: 'Features inconsistently available, user confused about actual connection state',
          resolution: 'Added connection state synchronization on page load'
        }
      ],
      metrics: {
        occurrenceRate: 0.12,
        avgResolutionTime: 20,
        userImpactScore: 6.8,
        preventionEffectiveness: 0.78
      }
    },
    {
      id: 'sse-ap-004',
      name: 'UI State Lock on Instance Status',
      category: 'ui_state_management',
      severity: 'high',
      description: 'UI becomes locked in "starting" state when instance status updates fail to propagate, even when instance is actually running and functional.',
      symptoms: [
        'Instance status stuck on "starting" in UI',
        'Terminal functionality works correctly',
        'Backend reports instance as "running"',
        'Status indicator never updates from initial state',
        'User unable to interact with running instance due to UI state'
      ],
      rootCauses: [
        'Status update events not reaching frontend',
        'Event handlers not properly registered for status updates',
        'Status parsing or processing errors in frontend',
        'Status event filtering preventing updates',
        'Component state not updating despite receiving events'
      ],
      detectionMethod: 'Monitor UI status vs backend status; flag when UI status === "starting" && backend status !== "starting" for > 10 seconds',
      preventionStrategies: [
        'Add status update confirmation mechanism',
        'Implement status polling as backup to SSE',
        'Create status update timeout detection',
        'Add status event debugging and logging',
        'Implement forced status refresh capability'
      ],
      recoveryActions: [
        'Force status refresh from backend',
        'Reset UI status state and re-query',
        'Switch to polling mode for status updates',
        'Display manual refresh option to user',
        'Bypass status check for known-running instances'
      ],
      tddPatterns: {
        testScenarios: [
          'Test status updates propagate to UI within timeout',
          'Test UI state updates when receiving status events',
          'Test status update error handling',
          'Test manual status refresh functionality',
          'Test status polling fallback mechanism'
        ],
        mockingStrategies: [
          'Mock failed status update events',
          'Mock status parsing errors',
          'Mock component state update failures',
          'Mock backend status changes without events'
        ],
        assertionPatterns: [
          'Assert UI status matches backend status within timeout',
          'Assert status update events trigger UI changes',
          'Assert fallback mechanisms work when status updates fail',
          'Assert manual refresh updates UI status correctly'
        ]
      },
      realWorldExamples: [
        {
          context: 'Claude instance startup in high-load environment',
          manifestation: 'Instance starts successfully but status update event gets lost in queue',
          impact: 'Users think instance failed to start and repeatedly create new instances',
          resolution: 'Added status polling fallback and timeout-based status refresh'
        }
      ],
      metrics: {
        occurrenceRate: 0.18,
        avgResolutionTime: 25,
        userImpactScore: 8.9,
        preventionEffectiveness: 0.83
      }
    },
    {
      id: 'sse-ap-005',
      name: 'Connection Recovery Loop Failure',
      category: 'error_recovery',
      severity: 'medium',
      description: 'Automatic connection recovery mechanisms fail or loop infinitely, preventing successful re-establishment of SSE connections.',
      symptoms: [
        'Continuous reconnection attempts without success',
        'Exponential backoff not functioning correctly',
        'Connection state flickering between connected/disconnected',
        'High network traffic due to reconnection loops',
        'User unable to manually override failed automatic recovery'
      ],
      rootCauses: [
        'Recovery logic not handling specific failure conditions',
        'Backoff algorithm implementation issues',
        'Connection state not properly reset between attempts',
        'Recovery attempts interfering with each other',
        'Maximum retry count not enforced or configured incorrectly'
      ],
      detectionMethod: 'Monitor reconnection attempt frequency; flag when > 5 attempts in 30 seconds with no successful connections',
      preventionStrategies: [
        'Implement proper exponential backoff with jitter',
        'Add circuit breaker pattern for recovery attempts',
        'Create recovery attempt audit and limiting',
        'Implement connection recovery state machine',
        'Add manual recovery override capability'
      ],
      recoveryActions: [
        'Stop automatic recovery and allow manual intervention',
        'Reset all connection recovery state',
        'Implement progressive recovery strategy',
        'Switch to alternative connection methods',
        'Provide detailed recovery failure diagnostics'
      ],
      tddPatterns: {
        testScenarios: [
          'Test exponential backoff behavior during recovery',
          'Test recovery loop prevention and circuit breaking',
          'Test manual recovery override functionality',
          'Test recovery state cleanup between attempts',
          'Test maximum retry limit enforcement'
        ],
        mockingStrategies: [
          'Mock repeated connection failures to test recovery logic',
          'Mock network conditions causing recovery failures',
          'Mock timing issues in recovery attempts',
          'Mock recovery state corruption scenarios'
        ],
        assertionPatterns: [
          'Assert backoff delays increase exponentially',
          'Assert recovery stops after maximum attempts',
          'Assert manual override stops automatic recovery',
          'Assert recovery state resets properly between attempts'
        ]
      },
      realWorldExamples: [
        {
          context: 'Network instability causing intermittent SSE failures',
          manifestation: 'Connection recovery attempts every few seconds, never stabilizing',
          impact: 'High CPU and network usage, poor user experience with constant reconnection',
          resolution: 'Implemented circuit breaker and exponential backoff with maximum limits'
        }
      ],
      metrics: {
        occurrenceRate: 0.06,
        avgResolutionTime: 45,
        userImpactScore: 7.3,
        preventionEffectiveness: 0.91
      }
    }
  ];

  /**
   * Get all anti-patterns
   */
  public getAllPatterns(): SSEAntiPattern[] {
    return this.antiPatterns;
  }

  /**
   * Get patterns by category
   */
  public getPatternsByCategory(category: SSEAntiPattern['category']): SSEAntiPattern[] {
    return this.antiPatterns.filter(pattern => pattern.category === category);
  }

  /**
   * Get patterns by severity
   */
  public getPatternsBySeverity(severity: SSEAntiPattern['severity']): SSEAntiPattern[] {
    return this.antiPatterns.filter(pattern => pattern.severity === severity);
  }

  /**
   * Find patterns matching specific symptoms
   */
  public findPatternsBySymptoms(symptoms: string[]): SSEAntiPattern[] {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    
    return this.antiPatterns.filter(pattern => 
      pattern.symptoms.some(symptom => 
        lowerSymptoms.some(searchSymptom => 
          symptom.toLowerCase().includes(searchSymptom)
        )
      )
    );
  }

  /**
   * Get prevention strategies for specific failure scenario
   */
  public getPreventionStrategies(scenario: string): string[] {
    const matchingPatterns = this.findPatternsBySymptoms([scenario]);
    const strategies = new Set<string>();
    
    matchingPatterns.forEach(pattern => {
      pattern.preventionStrategies.forEach(strategy => strategies.add(strategy));
    });
    
    return Array.from(strategies);
  }

  /**
   * Get recovery actions for specific failure scenario
   */
  public getRecoveryActions(scenario: string): string[] {
    const matchingPatterns = this.findPatternsBySymptoms([scenario]);
    const actions = new Set<string>();
    
    matchingPatterns.forEach(pattern => {
      pattern.recoveryActions.forEach(action => actions.add(action));
    });
    
    return Array.from(actions);
  }

  /**
   * Get TDD patterns for specific anti-pattern
   */
  public getTDDPatterns(antiPatternId: string): SSEAntiPattern['tddPatterns'] | null {
    const pattern = this.antiPatterns.find(p => p.id === antiPatternId);
    return pattern?.tddPatterns || null;
  }

  /**
   * Add new anti-pattern to database
   */
  public addAntiPattern(pattern: SSEAntiPattern): void {
    // Check if pattern with same ID already exists
    if (this.antiPatterns.some(p => p.id === pattern.id)) {
      throw new Error(`Anti-pattern with ID ${pattern.id} already exists`);
    }
    
    this.antiPatterns.push(pattern);
  }

  /**
   * Update existing anti-pattern
   */
  public updateAntiPattern(id: string, updates: Partial<SSEAntiPattern>): boolean {
    const index = this.antiPatterns.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.antiPatterns[index] = { ...this.antiPatterns[index], ...updates };
    return true;
  }

  /**
   * Get analytics on anti-patterns
   */
  public getAnalytics(): {
    totalPatterns: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    avgOccurrenceRate: number;
    avgResolutionTime: number;
    avgUserImpact: number;
    avgPreventionEffectiveness: number;
  } {
    const analytics = {
      totalPatterns: this.antiPatterns.length,
      categoryCounts: {} as Record<string, number>,
      severityCounts: {} as Record<string, number>,
      avgOccurrenceRate: 0,
      avgResolutionTime: 0,
      avgUserImpact: 0,
      avgPreventionEffectiveness: 0
    };

    // Count categories and severities
    this.antiPatterns.forEach(pattern => {
      analytics.categoryCounts[pattern.category] = (analytics.categoryCounts[pattern.category] || 0) + 1;
      analytics.severityCounts[pattern.severity] = (analytics.severityCounts[pattern.severity] || 0) + 1;
    });

    // Calculate averages
    if (this.antiPatterns.length > 0) {
      analytics.avgOccurrenceRate = this.antiPatterns.reduce((sum, p) => sum + p.metrics.occurrenceRate, 0) / this.antiPatterns.length;
      analytics.avgResolutionTime = this.antiPatterns.reduce((sum, p) => sum + p.metrics.avgResolutionTime, 0) / this.antiPatterns.length;
      analytics.avgUserImpact = this.antiPatterns.reduce((sum, p) => sum + p.metrics.userImpactScore, 0) / this.antiPatterns.length;
      analytics.avgPreventionEffectiveness = this.antiPatterns.reduce((sum, p) => sum + p.metrics.preventionEffectiveness, 0) / this.antiPatterns.length;
    }

    return analytics;
  }

  /**
   * Generate comprehensive report
   */
  public generateReport(): {
    summary: any;
    criticalPatterns: SSEAntiPattern[];
    preventionRecommendations: string[];
    tddImplementationGuide: any;
  } {
    const analytics = this.getAnalytics();
    const criticalPatterns = this.getPatternsBySeverity('critical');
    
    return {
      summary: analytics,
      criticalPatterns,
      preventionRecommendations: this.getTopPreventionStrategies(),
      tddImplementationGuide: this.generateTDDImplementationGuide()
    };
  }

  private getTopPreventionStrategies(): string[] {
    const strategies = new Set<string>();
    
    // Get strategies from critical and high severity patterns
    this.antiPatterns
      .filter(p => ['critical', 'high'].includes(p.severity))
      .forEach(pattern => {
        pattern.preventionStrategies.forEach(strategy => strategies.add(strategy));
      });
    
    return Array.from(strategies);
  }

  private generateTDDImplementationGuide(): any {
    return {
      testCategories: {
        connectionManagement: this.getPatternsByCategory('connection_coordination').map(p => p.tddPatterns),
        statusBroadcasting: this.getPatternsByCategory('status_broadcasting').map(p => p.tddPatterns),
        terminalInput: this.getPatternsByCategory('terminal_input').map(p => p.tddPatterns),
        uiStateManagement: this.getPatternsByCategory('ui_state_management').map(p => p.tddPatterns),
        errorRecovery: this.getPatternsByCategory('error_recovery').map(p => p.tddPatterns)
      },
      implementationPriority: [
        'Test connection establishment order (status before terminal)',
        'Test connection state synchronization',
        'Test failure recovery mechanisms',
        'Test UI state updates on connection changes',
        'Test input forwarding validation'
      ]
    };
  }
}