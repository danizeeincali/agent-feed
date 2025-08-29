/**
 * Comprehensive Failure Scenario Database
 * 
 * Maintains extensive database of Claude process failure scenarios
 * for training neural networks and improving regression detection.
 */

export interface FailureScenario {
  id: string;
  name: string;
  description: string;
  category: FailureCategory;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  triggerConditions: TriggerCondition[];
  symptoms: Symptom[];
  rootCause: string;
  affectedComponents: string[];
  preventionStrategy: string;
  recoveryProcedure: string;
  detectionSignatures: DetectionSignature[];
  realWorldOccurrences: OccurrenceRecord[];
  neuralTrainingFeatures: number[];
  validationTests: ValidationTest[];
}

export interface TriggerCondition {
  condition: string;
  parameters: Record<string, any>;
  likelihood: number;
  timeframe: string;
}

export interface Symptom {
  symptom: string;
  visibility: 'immediate' | 'delayed' | 'silent';
  severity: number;
  detectionMethod: string;
}

export interface DetectionSignature {
  signatureType: 'regex' | 'behavioral' | 'metric' | 'temporal';
  pattern: string | RegExp;
  confidence: number;
  falsePositiveRate: number;
}

export interface OccurrenceRecord {
  timestamp: Date;
  environment: string;
  triggeredBy: string;
  duration: number;
  resolved: boolean;
  resolutionMethod: string;
  impact: string;
}

export interface ValidationTest {
  testId: string;
  description: string;
  setup: string;
  execution: string;
  expectedOutcome: string;
  actualOutcome?: string;
  passed?: boolean;
}

export enum FailureCategory {
  PRINT_FLAG_REGRESSION = 'PRINT_FLAG_REGRESSION',
  MOCK_CLAUDE_FALLBACK = 'MOCK_CLAUDE_FALLBACK',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  DIRECTORY_RESOLUTION = 'DIRECTORY_RESOLUTION',
  PROCESS_SPAWNING = 'PROCESS_SPAWNING',
  SSE_CONNECTION = 'SSE_CONNECTION',
  PTY_CONFIGURATION = 'PTY_CONFIGURATION',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  PERMISSION_ERRORS = 'PERMISSION_ERRORS'
}

export class FailureScenarioDatabase {
  private scenarios: Map<string, FailureScenario> = new Map();
  private categoryIndex: Map<FailureCategory, string[]> = new Map();
  private severityIndex: Map<string, string[]> = new Map();
  private searchIndex: Map<string, string[]> = new Map();

  constructor() {
    this.initializeFailureScenarios();
    this.buildIndexes();
  }

  /**
   * Initialize comprehensive failure scenarios
   */
  private initializeFailureScenarios(): void {
    const scenarios: FailureScenario[] = [
      {
        id: 'print_flag_stealth_injection',
        name: 'Stealth Print Flag Injection',
        description: 'Print flags are subtly injected through various code paths, breaking interactive Claude sessions',
        category: FailureCategory.PRINT_FLAG_REGRESSION,
        severity: 'CRITICAL',
        triggerConditions: [
          {
            condition: 'code_modification',
            parameters: { files: ['*.js', '*.ts'], pattern: 'command.*args.*push' },
            likelihood: 0.3,
            timeframe: 'during_development'
          },
          {
            condition: 'config_change',
            parameters: { config: 'spawn_commands', change: 'add_flags' },
            likelihood: 0.2,
            timeframe: 'deployment'
          }
        ],
        symptoms: [
          {
            symptom: 'Claude process outputs single response then exits',
            visibility: 'immediate',
            severity: 9,
            detectionMethod: 'process_monitoring'
          },
          {
            symptom: 'No interactive terminal session',
            visibility: 'immediate',
            severity: 8,
            detectionMethod: 'user_interaction'
          },
          {
            symptom: 'Command contains --print in arguments',
            visibility: 'immediate',
            severity: 10,
            detectionMethod: 'command_inspection'
          }
        ],
        rootCause: 'Development changes inadvertently add --print flags to Claude command construction',
        affectedComponents: ['process_spawning', 'command_construction', 'interactive_session'],
        preventionStrategy: 'Implement command argument validation before process spawn',
        recoveryProcedure: 'Strip --print flags and restart processes with clean commands',
        detectionSignatures: [
          {
            signatureType: 'regex',
            pattern: /--print(?:\s|$)/,
            confidence: 0.95,
            falsePositiveRate: 0.02
          },
          {
            signatureType: 'behavioral',
            pattern: 'process_exit_after_single_response',
            confidence: 0.85,
            falsePositiveRate: 0.05
          }
        ],
        realWorldOccurrences: [
          {
            timestamp: new Date('2025-01-15T10:30:00Z'),
            environment: 'development',
            triggeredBy: 'code_refactoring',
            duration: 1200, // 20 minutes
            resolved: true,
            resolutionMethod: 'manual_flag_removal',
            impact: 'complete_system_breakdown'
          }
        ],
        neuralTrainingFeatures: [1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0], // [has_print_flags, interactive_expected, mock_mode, auth_ok, dir_ok, real_claude, pty_mode]
        validationTests: [
          {
            testId: 'print_flag_detection_test',
            description: 'Verify print flag detection in various command structures',
            setup: 'Create Claude command with --print flag',
            execution: 'Run detection system',
            expectedOutcome: 'Flag detected with >90% confidence'
          }
        ]
      },
      {
        id: 'mock_claude_silent_activation',
        name: 'Silent Mock Claude Activation',
        description: 'System silently falls back to mock Claude without user awareness',
        category: FailureCategory.MOCK_CLAUDE_FALLBACK,
        severity: 'CRITICAL',
        triggerConditions: [
          {
            condition: 'authentication_failure',
            parameters: { auth_method: 'any', retries: 0 },
            likelihood: 0.4,
            timeframe: 'process_creation'
          },
          {
            condition: 'claude_cli_unavailable',
            parameters: { path_missing: true, permission_denied: true },
            likelihood: 0.3,
            timeframe: 'process_creation'
          }
        ],
        symptoms: [
          {
            symptom: 'Process type shows as "mock"',
            visibility: 'silent',
            severity: 8,
            detectionMethod: 'process_inspection'
          },
          {
            symptom: 'Responses are too fast and generic',
            visibility: 'delayed',
            severity: 6,
            detectionMethod: 'response_analysis'
          },
          {
            symptom: 'isMock flag is true',
            visibility: 'immediate',
            severity: 9,
            detectionMethod: 'flag_inspection'
          }
        ],
        rootCause: 'Authentication or CLI availability issues trigger silent fallback to mock mode',
        affectedComponents: ['authentication', 'process_creation', 'user_experience'],
        preventionStrategy: 'Force authentication validation and fail fast if real Claude unavailable',
        recoveryProcedure: 'Fix authentication, terminate mock processes, create real processes',
        detectionSignatures: [
          {
            signatureType: 'regex',
            pattern: /MockClaudeProcess|isMock.*true|processType.*mock/,
            confidence: 0.9,
            falsePositiveRate: 0.01
          },
          {
            signatureType: 'metric',
            pattern: 'response_time_too_low',
            confidence: 0.7,
            falsePositiveRate: 0.15
          }
        ],
        realWorldOccurrences: [
          {
            timestamp: new Date('2025-01-12T14:20:00Z'),
            environment: 'production',
            triggeredBy: 'authentication_service_outage',
            duration: 3600, // 1 hour
            resolved: true,
            resolutionMethod: 'authentication_service_restart',
            impact: 'degraded_user_experience'
          }
        ],
        neuralTrainingFeatures: [0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0],
        validationTests: [
          {
            testId: 'mock_detection_test',
            description: 'Verify mock process detection',
            setup: 'Force mock Claude activation',
            execution: 'Run detection system',
            expectedOutcome: 'Mock mode detected within 1 second'
          }
        ]
      },
      {
        id: 'authentication_cascade_failure',
        name: 'Authentication Cascade Failure',
        description: 'Authentication system experiences cascading failures across multiple validation methods',
        category: FailureCategory.AUTHENTICATION_FAILURE,
        severity: 'HIGH',
        triggerConditions: [
          {
            condition: 'credentials_file_corruption',
            parameters: { file: '.credentials.json', corruption_type: 'json_invalid' },
            likelihood: 0.1,
            timeframe: 'system_startup'
          },
          {
            condition: 'environment_variable_missing',
            parameters: { var: 'CLAUDECODE', expected_value: '1' },
            likelihood: 0.2,
            timeframe: 'process_spawn'
          }
        ],
        symptoms: [
          {
            symptom: 'Multiple authentication methods fail sequentially',
            visibility: 'immediate',
            severity: 8,
            detectionMethod: 'auth_monitoring'
          },
          {
            symptom: 'Claude CLI reports not authenticated',
            visibility: 'immediate',
            severity: 9,
            detectionMethod: 'cli_test'
          }
        ],
        rootCause: 'Multiple authentication mechanisms fail due to configuration or environment issues',
        affectedComponents: ['authentication', 'process_creation', 'user_sessions'],
        preventionStrategy: 'Implement robust authentication health checks with fallback methods',
        recoveryProcedure: 'Diagnose and fix authentication configuration, restart auth system',
        detectionSignatures: [
          {
            signatureType: 'regex',
            pattern: /Claude CLI.*not.*available|authentication.*failed|not authenticated/i,
            confidence: 0.85,
            falsePositiveRate: 0.1
          }
        ],
        realWorldOccurrences: [],
        neuralTrainingFeatures: [0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0],
        validationTests: [
          {
            testId: 'auth_cascade_simulation',
            description: 'Simulate authentication cascade failure',
            setup: 'Corrupt credentials and remove env vars',
            execution: 'Attempt process creation',
            expectedOutcome: 'Cascade failure detected and recovered'
          }
        ]
      },
      {
        id: 'directory_resolution_security_bypass',
        name: 'Directory Resolution Security Bypass',
        description: 'Malicious or accidental bypass of directory security constraints',
        category: FailureCategory.DIRECTORY_RESOLUTION,
        severity: 'HIGH',
        triggerConditions: [
          {
            condition: 'path_traversal_attempt',
            parameters: { path: '../../../sensitive', method: 'relative_path' },
            likelihood: 0.15,
            timeframe: 'instance_creation'
          },
          {
            condition: 'symlink_exploitation',
            parameters: { target: '/etc/passwd', link: 'working_dir' },
            likelihood: 0.05,
            timeframe: 'directory_validation'
          }
        ],
        symptoms: [
          {
            symptom: 'Process working directory outside base path',
            visibility: 'immediate',
            severity: 10,
            detectionMethod: 'security_validation'
          },
          {
            symptom: 'Security violation logged',
            visibility: 'immediate',
            severity: 9,
            detectionMethod: 'log_monitoring'
          }
        ],
        rootCause: 'Directory resolution logic fails to properly validate and constrain paths',
        affectedComponents: ['directory_resolution', 'security', 'process_isolation'],
        preventionStrategy: 'Strict path validation with whitelist approach and real path resolution',
        recoveryProcedure: 'Kill violating processes, reset to secure base directory',
        detectionSignatures: [
          {
            signatureType: 'regex',
            pattern: /Security violation.*Directory outside|\.\.\/|path traversal/i,
            confidence: 0.95,
            falsePositiveRate: 0.02
          }
        ],
        realWorldOccurrences: [],
        neuralTrainingFeatures: [0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0],
        validationTests: [
          {
            testId: 'path_traversal_test',
            description: 'Test path traversal detection',
            setup: 'Attempt directory traversal',
            execution: 'Run security validation',
            expectedOutcome: 'Traversal attempt blocked'
          }
        ]
      },
      {
        id: 'sse_connection_storm',
        name: 'SSE Connection Storm',
        description: 'Excessive SSE connections overwhelm server and cause output loss',
        category: FailureCategory.SSE_CONNECTION,
        severity: 'MEDIUM',
        triggerConditions: [
          {
            condition: 'rapid_reconnections',
            parameters: { rate: '>10/second', duration: '>30s' },
            likelihood: 0.3,
            timeframe: 'high_load'
          },
          {
            condition: 'client_reconnection_loop',
            parameters: { client: 'frontend', loop_interval: '<1s' },
            likelihood: 0.2,
            timeframe: 'network_instability'
          }
        ],
        symptoms: [
          {
            symptom: 'High number of SSE connections',
            visibility: 'immediate',
            severity: 6,
            detectionMethod: 'connection_counting'
          },
          {
            symptom: 'Server memory usage increases rapidly',
            visibility: 'delayed',
            severity: 7,
            detectionMethod: 'memory_monitoring'
          },
          {
            symptom: 'Output broadcast failures increase',
            visibility: 'delayed',
            severity: 8,
            detectionMethod: 'error_monitoring'
          }
        ],
        rootCause: 'Client reconnection loops or network issues cause connection multiplication',
        affectedComponents: ['sse_connections', 'memory_usage', 'output_delivery'],
        preventionStrategy: 'Connection rate limiting and client-side reconnection backoff',
        recoveryProcedure: 'Close excess connections, implement connection limits, restart server if needed',
        detectionSignatures: [
          {
            signatureType: 'metric',
            pattern: 'connection_count_spike',
            confidence: 0.8,
            falsePositiveRate: 0.1
          }
        ],
        realWorldOccurrences: [],
        neuralTrainingFeatures: [0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0],
        validationTests: [
          {
            testId: 'connection_storm_test',
            description: 'Simulate SSE connection storm',
            setup: 'Create multiple rapid connections',
            execution: 'Monitor server behavior',
            expectedOutcome: 'Rate limiting prevents storm'
          }
        ]
      },
      {
        id: 'command_injection_vulnerability',
        name: 'Command Injection Vulnerability',
        description: 'Malicious command injection through user input or configuration',
        category: FailureCategory.COMMAND_INJECTION,
        severity: 'CRITICAL',
        triggerConditions: [
          {
            condition: 'unsanitized_input',
            parameters: { input_source: 'user_prompt', injection: 'shell_metacharacters' },
            likelihood: 0.05,
            timeframe: 'user_interaction'
          },
          {
            condition: 'config_manipulation',
            parameters: { config: 'command_args', malicious: 'shell_command' },
            likelihood: 0.02,
            timeframe: 'configuration_change'
          }
        ],
        symptoms: [
          {
            symptom: 'Unexpected processes spawned',
            visibility: 'immediate',
            severity: 10,
            detectionMethod: 'process_monitoring'
          },
          {
            symptom: 'Command contains shell metacharacters',
            visibility: 'immediate',
            severity: 9,
            detectionMethod: 'command_inspection'
          },
          {
            symptom: 'Unusual system calls detected',
            visibility: 'immediate',
            severity: 8,
            detectionMethod: 'syscall_monitoring'
          }
        ],
        rootCause: 'Insufficient input validation allows injection of malicious commands',
        affectedComponents: ['command_construction', 'input_validation', 'system_security'],
        preventionStrategy: 'Strict input validation and command sanitization',
        recoveryProcedure: 'Kill malicious processes, sanitize inputs, restart with clean commands',
        detectionSignatures: [
          {
            signatureType: 'regex',
            pattern: /[;&|`$(){}\\]/,
            confidence: 0.7,
            falsePositiveRate: 0.2
          }
        ],
        realWorldOccurrences: [],
        neuralTrainingFeatures: [0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0],
        validationTests: [
          {
            testId: 'command_injection_test',
            description: 'Test command injection detection',
            setup: 'Inject shell metacharacters',
            execution: 'Run validation system',
            expectedOutcome: 'Injection detected and blocked'
          }
        ]
      }
    ];

    scenarios.forEach(scenario => {
      this.scenarios.set(scenario.id, scenario);
    });

    console.log(`📋 Initialized ${scenarios.length} failure scenarios in database`);
  }

  /**
   * Build search and category indexes
   */
  private buildIndexes(): void {
    // Build category index
    for (const scenario of this.scenarios.values()) {
      if (!this.categoryIndex.has(scenario.category)) {
        this.categoryIndex.set(scenario.category, []);
      }
      this.categoryIndex.get(scenario.category)!.push(scenario.id);

      // Build severity index
      if (!this.severityIndex.has(scenario.severity)) {
        this.severityIndex.set(scenario.severity, []);
      }
      this.severityIndex.get(scenario.severity)!.push(scenario.id);

      // Build search index (keywords)
      const keywords = [
        ...scenario.name.toLowerCase().split(' '),
        ...scenario.description.toLowerCase().split(' '),
        scenario.category.toLowerCase(),
        scenario.severity.toLowerCase(),
        ...scenario.affectedComponents
      ];

      keywords.forEach(keyword => {
        if (!this.searchIndex.has(keyword)) {
          this.searchIndex.set(keyword, []);
        }
        if (!this.searchIndex.get(keyword)!.includes(scenario.id)) {
          this.searchIndex.get(keyword)!.push(scenario.id);
        }
      });
    }

    console.log(`🔍 Built indexes: ${this.categoryIndex.size} categories, ${this.severityIndex.size} severity levels`);
  }

  /**
   * Get scenario by ID
   */
  public getScenario(id: string): FailureScenario | null {
    return this.scenarios.get(id) || null;
  }

  /**
   * Get scenarios by category
   */
  public getScenariosByCategory(category: FailureCategory): FailureScenario[] {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.scenarios.get(id)!).filter(Boolean);
  }

  /**
   * Get scenarios by severity
   */
  public getScenariosBySeverity(severity: string): FailureScenario[] {
    const ids = this.severityIndex.get(severity) || [];
    return ids.map(id => this.scenarios.get(id)!).filter(Boolean);
  }

  /**
   * Search scenarios by keywords
   */
  public searchScenarios(query: string): FailureScenario[] {
    const keywords = query.toLowerCase().split(' ');
    const matchingIds = new Set<string>();

    keywords.forEach(keyword => {
      const ids = this.searchIndex.get(keyword) || [];
      ids.forEach(id => matchingIds.add(id));
    });

    return Array.from(matchingIds).map(id => this.scenarios.get(id)!).filter(Boolean);
  }

  /**
   * Get all scenarios
   */
  public getAllScenarios(): FailureScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Add new scenario
   */
  public addScenario(scenario: FailureScenario): void {
    this.scenarios.set(scenario.id, scenario);
    this.buildIndexes(); // Rebuild indexes
    console.log(`📝 Added new failure scenario: ${scenario.name}`);
  }

  /**
   * Update scenario with real-world occurrence
   */
  public addOccurrence(scenarioId: string, occurrence: OccurrenceRecord): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (scenario) {
      scenario.realWorldOccurrences.push(occurrence);
      console.log(`📊 Added occurrence to scenario: ${scenario.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get neural training dataset from all scenarios
   */
  public getNeuralTrainingDataset(): any {
    const dataset = {
      scenarios: this.getAllScenarios().map(scenario => ({
        id: scenario.id,
        features: scenario.neuralTrainingFeatures,
        labels: [scenario.category, scenario.severity],
        metadata: {
          name: scenario.name,
          rootCause: scenario.rootCause,
          preventionStrategy: scenario.preventionStrategy
        }
      })),
      featureNames: [
        'has_print_flags',
        'interactive_expected', 
        'mock_mode',
        'auth_ok',
        'dir_ok',
        'real_claude',
        'pty_mode'
      ],
      categories: Array.from(this.categoryIndex.keys()),
      exportedAt: new Date().toISOString()
    };

    console.log(`📤 Exported neural training dataset: ${dataset.scenarios.length} scenarios`);
    return dataset;
  }

  /**
   * Get failure statistics
   */
  public getStatistics(): any {
    const totalScenarios = this.scenarios.size;
    const categoryCounts = new Map<FailureCategory, number>();
    const severityCounts = new Map<string, number>();
    const totalOccurrences = Array.from(this.scenarios.values()).reduce(
      (total, scenario) => total + scenario.realWorldOccurrences.length, 0
    );

    // Count by category
    for (const [category, ids] of this.categoryIndex.entries()) {
      categoryCounts.set(category, ids.length);
    }

    // Count by severity
    for (const [severity, ids] of this.severityIndex.entries()) {
      severityCounts.set(severity, ids.length);
    }

    return {
      totalScenarios,
      totalOccurrences,
      categoryCounts: Object.fromEntries(categoryCounts),
      severityCounts: Object.fromEntries(severityCounts),
      averageOccurrencesPerScenario: totalScenarios > 0 ? totalOccurrences / totalScenarios : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Validate scenario completeness
   */
  public validateScenario(scenarioId: string): any {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      return { valid: false, reason: 'Scenario not found' };
    }

    const issues = [];

    if (scenario.triggerConditions.length === 0) {
      issues.push('No trigger conditions defined');
    }

    if (scenario.symptoms.length === 0) {
      issues.push('No symptoms defined');
    }

    if (scenario.detectionSignatures.length === 0) {
      issues.push('No detection signatures defined');
    }

    if (scenario.neuralTrainingFeatures.length === 0) {
      issues.push('No neural training features defined');
    }

    if (scenario.validationTests.length === 0) {
      issues.push('No validation tests defined');
    }

    return {
      valid: issues.length === 0,
      issues,
      completeness: Math.max(0, 1 - (issues.length * 0.2))
    };
  }
}

// Export singleton instance
export const failureScenarioDatabase = new FailureScenarioDatabase();

console.log('📋 Comprehensive Failure Scenario Database initialized');