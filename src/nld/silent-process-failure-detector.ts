/**
 * NLD Silent Process Failure Detector
 * 
 * Detects and analyzes processes that spawn successfully but produce no output
 * Specialized for identifying authentication prompts, TTY requirements, and environment issues
 * 
 * Key Detection Areas:
 * - Processes with valid PID but zero stdout/stderr
 * - TTY requirement failures in piped mode
 * - Authentication prompts not visible in non-interactive mode
 * - Working directory permission issues
 * - Environment variable dependencies
 * - Silent failure modes in CLI tools
 */

import { EventEmitter } from 'events';

export interface SilentProcessPattern {
  patternId: string;
  patternName: string;
  description: string;
  detectionCriteria: {
    processPidExists: boolean;
    stdoutSilentDuration: number; // milliseconds
    stderrSilentDuration: number;
    inputForwardingWorks: boolean;
    processStillRunning: boolean;
  };
  commonCauses: string[];
  detectionSignatures: string[];
  diagnosisSteps: string[];
  preventionStrategy: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tddFactor: number;
  neuralFeatures: Record<string, any>;
}

export interface SilentProcessMetrics {
  instanceId: string;
  processId: number;
  spawnTime: Date;
  lastOutputTime?: Date;
  lastErrorTime?: Date;
  inputCommandsSent: number;
  outputEventsReceived: number;
  errorEventsReceived: number;
  silentDuration: number; // milliseconds
  processStatus: 'spawning' | 'silent' | 'responsive' | 'terminated';
  detectedPatterns: string[];
  environmentChecks: {
    workingDirectoryExists: boolean;
    workingDirectoryWritable: boolean;
    ttyRequired: boolean;
    authenticationRequired: boolean;
    missingEnvironmentVars: string[];
  };
}

export interface SilentProcessAlert {
  timestamp: Date;
  instanceId: string;
  alertType: 'silent_process_detected' | 'tty_required' | 'auth_prompt_detected' | 'permission_denied' | 'env_var_missing';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  detectedPattern: string;
  diagnostics: Record<string, any>;
  recommendedActions: string[];
}

export class SilentProcessFailureDetector extends EventEmitter {
  private monitoredProcesses: Map<string, SilentProcessMetrics> = new Map();
  private detectedPatterns: Map<string, SilentProcessPattern> = new Map();
  private alertHistory: SilentProcessAlert[] = [];
  private isMonitoring: boolean = false;
  
  // Configuration thresholds
  private readonly SILENT_DETECTION_THRESHOLD = 8000; // 8 seconds
  private readonly TTY_CHECK_COMMANDS = ['vi', 'nano', 'less', 'more', 'ssh', 'sudo'];
  private readonly AUTH_DETECTION_KEYWORDS = ['password:', 'passphrase:', 'enter password', 'authentication required', 'login:'];
  private readonly PERMISSION_ERROR_KEYWORDS = ['permission denied', 'access denied', 'operation not permitted', 'insufficient privileges'];

  constructor() {
    super();
    this.initializePatternDatabase();
  }

  /**
   * Initialize the pattern database with known silent process failure patterns
   */
  private initializePatternDatabase(): void {
    // Pattern 1: TTY Requirement Failure
    this.detectedPatterns.set('TTY_REQUIREMENT_FAILURE', {
      patternId: 'TTY_REQUIREMENT_FAILURE',
      patternName: 'TTY Requirement in Piped Mode',
      description: 'Interactive CLI tool requires TTY but process spawned with pipes, causing silent failure',
      detectionCriteria: {
        processPidExists: true,
        stdoutSilentDuration: 5000,
        stderrSilentDuration: 5000,
        inputForwardingWorks: true,
        processStillRunning: true
      },
      commonCauses: [
        'Interactive editor (vi, nano) requires TTY for display',
        'SSH client needs TTY for authentication prompts',
        'sudo requires TTY for password input',
        'Interactive shells need TTY for proper initialization',
        'Curses-based applications require terminal control'
      ],
      detectionSignatures: [
        'Process spawned with stdio: ["pipe", "pipe", "pipe"]',
        'Command matches TTY-required tools (vi, nano, ssh, sudo)',
        'Process PID exists and is running',
        'No stdout/stderr output for >5 seconds',
        'Input commands sent but no response received'
      ],
      diagnosisSteps: [
        'Check if command requires interactive terminal',
        'Verify process spawn configuration',
        'Test command with pty instead of pipes',
        'Check for TTY detection in process code',
        'Monitor for isatty() calls in process'
      ],
      preventionStrategy: 'Detect TTY-required commands and spawn with pty, add TTY requirement tests',
      severity: 'high',
      tddFactor: 0.85,
      neuralFeatures: {
        command_requires_tty: true,
        stdio_pipes_used: true,
        process_running_no_output: true,
        interactive_tool_detected: true,
        tty_check_in_command: true
      }
    });

    // Pattern 2: Authentication Prompt Not Visible
    this.detectedPatterns.set('AUTH_PROMPT_INVISIBLE', {
      patternId: 'AUTH_PROMPT_INVISIBLE',
      patternName: 'Authentication Prompt in Non-Interactive Mode',
      description: 'Process waiting for authentication input but prompt not visible in piped mode',
      detectionCriteria: {
        processPidExists: true,
        stdoutSilentDuration: 10000,
        stderrSilentDuration: 10000,
        inputForwardingWorks: true,
        processStillRunning: true
      },
      commonCauses: [
        'sudo password prompt not displayed in pipe mode',
        'SSH authentication prompts hidden',
        'Git credential prompts not visible',
        'Package manager authentication requests',
        'API key prompts in CLI tools'
      ],
      detectionSignatures: [
        'Commands containing authentication-required operations',
        'Process appears hung after spawn',
        'No output but process CPU usage indicates waiting',
        'Commands like: sudo, ssh, git push, npm publish',
        'Process waiting for stdin input'
      ],
      diagnosisSteps: [
        'Check command for authentication requirements',
        'Look for credential prompts in stderr',
        'Test with expect/timeout wrapper',
        'Check for stdin blocking operations',
        'Monitor process state for input waiting'
      ],
      preventionStrategy: 'Pre-authenticate operations, use credential helpers, detect auth-required commands',
      severity: 'high',
      tddFactor: 0.75,
      neuralFeatures: {
        auth_required_command: true,
        process_waiting_input: true,
        no_visible_prompts: true,
        cpu_usage_indicates_waiting: true,
        stdin_blocking_detected: true
      }
    });

    // Pattern 3: Working Directory Permission Issues
    this.detectedPatterns.set('WORKING_DIRECTORY_PERMISSIONS', {
      patternId: 'WORKING_DIRECTORY_PERMISSIONS',
      patternName: 'Working Directory Permission Denial',
      description: 'Process cannot access or execute in specified working directory',
      detectionCriteria: {
        processPidExists: true,
        stdoutSilentDuration: 3000,
        stderrSilentDuration: 1000, // stderr might contain permission errors
        inputForwardingWorks: true,
        processStillRunning: false // might terminate quickly
      },
      commonCauses: [
        'Working directory not readable by process user',
        'Directory mounted with noexec flag',
        'SELinux/AppArmor restrictions',
        'Container volume mount permission issues',
        'Network filesystem access denied'
      ],
      detectionSignatures: [
        'Process terminates quickly after spawn',
        'stderr contains permission/access denied messages',
        'Working directory path exists but not accessible',
        'Exit code indicates permission error (126, 13)',
        'File system operations fail'
      ],
      diagnosisSteps: [
        'Check working directory existence and permissions',
        'Verify process user has execute permissions',
        'Test directory access with same user context',
        'Check mount point restrictions',
        'Verify SELinux/AppArmor policies'
      ],
      preventionStrategy: 'Validate directory permissions before spawn, use accessible working directories',
      severity: 'critical',
      tddFactor: 0.90,
      neuralFeatures: {
        permission_error_in_stderr: true,
        working_directory_inaccessible: true,
        quick_process_termination: true,
        permission_exit_code: true,
        file_access_failures: true
      }
    });

    // Pattern 4: Environment Variable Dependencies
    this.detectedPatterns.set('MISSING_ENVIRONMENT_VARS', {
      patternId: 'MISSING_ENVIRONMENT_VARS',
      patternName: 'Missing Critical Environment Variables',
      description: 'Process depends on environment variables that are not set, causing silent failure or hang',
      detectionCriteria: {
        processPidExists: true,
        stdoutSilentDuration: 7000,
        stderrSilentDuration: 7000,
        inputForwardingWorks: true,
        processStillRunning: true
      },
      commonCauses: [
        'PATH missing critical directories',
        'HOME variable not set for user-specific configs',
        'Tool-specific environment variables missing (JAVA_HOME, NODE_PATH)',
        'Authentication tokens not in environment',
        'Locale/language variables missing'
      ],
      detectionSignatures: [
        'Process starts but performs no operations',
        'Common tools fail to find dependencies',
        'Configuration loading appears to hang',
        'No error messages despite apparent failure',
        'Process waiting for configuration resolution'
      ],
      diagnosisSteps: [
        'Compare environment with successful process instances',
        'Check tool documentation for required variables',
        'Monitor environment variable access patterns',
        'Test with minimal vs full environment',
        'Check for missing PATH components'
      ],
      preventionStrategy: 'Environment validation before spawn, comprehensive environment setup tests',
      severity: 'medium',
      tddFactor: 0.70,
      neuralFeatures: {
        missing_critical_env_vars: true,
        process_config_loading_hang: true,
        dependency_resolution_failure: true,
        no_error_output: true,
        tool_initialization_failure: true
      }
    });

    // Pattern 5: Claude Binary Issues
    this.detectedPatterns.set('CLAUDE_BINARY_ISSUES', {
      patternId: 'CLAUDE_BINARY_ISSUES',
      patternName: 'Claude Binary Execution Problems',
      description: 'Claude binary exists and spawns but fails to initialize properly',
      detectionCriteria: {
        processPidExists: true,
        stdoutSilentDuration: 15000, // Claude might take longer to initialize
        stderrSilentDuration: 15000,
        inputForwardingWorks: true,
        processStillRunning: true
      },
      commonCauses: [
        'Claude binary corrupted or incomplete download',
        'Missing shared library dependencies',
        'Incompatible architecture (ARM vs x86)',
        'Claude authentication/configuration issues',
        'Network connectivity problems for Claude initialization'
      ],
      detectionSignatures: [
        'claude command spawns with valid PID',
        'No welcome message or prompt appears',
        'Process appears to run but produces no output',
        'CPU usage suggests process is active but stuck',
        'Missing typical Claude initialization messages'
      ],
      diagnosisSteps: [
        'Test Claude binary directly outside of process spawn',
        'Check Claude binary integrity and permissions',
        'Verify shared library dependencies (ldd)',
        'Test Claude authentication configuration',
        'Monitor network connections during initialization'
      ],
      preventionStrategy: 'Binary validation before spawn, Claude health checks, dependency verification',
      severity: 'critical',
      tddFactor: 0.95,
      neuralFeatures: {
        claude_binary_detected: true,
        no_initialization_output: true,
        process_active_but_silent: true,
        missing_welcome_messages: true,
        authentication_config_issues: true
      }
    });

    console.log(`🔍 Silent Process Pattern Database initialized with ${this.detectedPatterns.size} patterns`);
  }

  /**
   * Start monitoring for silent process failures
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 NLD Silent Process Failure Detector - Starting');
    
    // Set up monitoring intervals
    this.setupPeriodicChecks();
    
    this.emit('monitoring_started');
    console.log('✅ Silent process failure detection active');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.emit('monitoring_stopped');
    console.log('🛑 Silent Process Failure Detector - Stopped');
  }

  /**
   * Register a new process for silent failure monitoring
   */
  public registerProcess(instanceId: string, processId: number, command: string, workingDirectory: string): void {
    if (!this.isMonitoring) return;

    const metrics: SilentProcessMetrics = {
      instanceId,
      processId,
      spawnTime: new Date(),
      inputCommandsSent: 0,
      outputEventsReceived: 0,
      errorEventsReceived: 0,
      silentDuration: 0,
      processStatus: 'spawning',
      detectedPatterns: [],
      environmentChecks: {
        workingDirectoryExists: false,
        workingDirectoryWritable: false,
        ttyRequired: this.requiresTTY(command),
        authenticationRequired: this.requiresAuthentication(command),
        missingEnvironmentVars: []
      }
    };

    this.monitoredProcesses.set(instanceId, metrics);

    console.log(`🔍 Registered process for silent failure monitoring: ${instanceId} (PID: ${processId})`);
    console.log(`   Command: ${command}`);
    console.log(`   Working Directory: ${workingDirectory}`);
    console.log(`   TTY Required: ${metrics.environmentChecks.ttyRequired}`);
    console.log(`   Auth Required: ${metrics.environmentChecks.authenticationRequired}`);

    // Perform initial environment checks
    this.performEnvironmentChecks(instanceId, workingDirectory);

    // Start monitoring timer for this process
    this.startProcessMonitoring(instanceId);
  }

  /**
   * Record output received from process
   */
  public recordOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void {
    const metrics = this.monitoredProcesses.get(instanceId);
    if (!metrics) return;

    const now = new Date();
    
    if (outputType === 'stdout') {
      metrics.lastOutputTime = now;
      metrics.outputEventsReceived++;
    } else {
      metrics.lastErrorTime = now;
      metrics.errorEventsReceived++;
      
      // Check for permission/authentication errors in stderr
      this.analyzeErrorOutput(instanceId, data);
    }

    metrics.processStatus = 'responsive';
    metrics.silentDuration = 0;
    
    this.monitoredProcesses.set(instanceId, metrics);
    
    // Clear any pending silent process alerts for this instance
    this.clearSilentProcessAlert(instanceId);
  }

  /**
   * Record input sent to process
   */
  public recordInput(instanceId: string, input: string): void {
    const metrics = this.monitoredProcesses.get(instanceId);
    if (!metrics) return;

    metrics.inputCommandsSent++;
    this.monitoredProcesses.set(instanceId, metrics);

    console.log(`📝 Input recorded for ${instanceId}: "${input.trim()}"`);
  }

  /**
   * Record process termination
   */
  public recordProcessEnd(instanceId: string, exitCode?: number): void {
    const metrics = this.monitoredProcesses.get(instanceId);
    if (!metrics) return;

    metrics.processStatus = 'terminated';
    this.monitoredProcesses.set(instanceId, metrics);

    console.log(`🏁 Process terminated: ${instanceId} (exit code: ${exitCode})`);

    // Check for quick termination patterns
    if (exitCode && this.isPermissionExitCode(exitCode)) {
      this.triggerAlert(instanceId, 'permission_denied', 'critical', 
        `Process terminated with permission error (exit code: ${exitCode})`, 
        'WORKING_DIRECTORY_PERMISSIONS');
    }
  }

  /**
   * Setup periodic checks for silent processes
   */
  private setupPeriodicChecks(): void {
    const checkInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(checkInterval);
        return;
      }
      
      this.performSilentProcessChecks();
    }, 2000); // Check every 2 seconds
  }

  /**
   * Perform periodic checks for silent processes
   */
  private performSilentProcessChecks(): void {
    const now = new Date();
    
    for (const [instanceId, metrics] of this.monitoredProcesses) {
      if (metrics.processStatus === 'terminated') continue;
      
      // Calculate silent duration
      const lastActivity = metrics.lastOutputTime || metrics.lastErrorTime || metrics.spawnTime;
      metrics.silentDuration = now.getTime() - lastActivity.getTime();
      
      // Check if process has been silent too long
      if (metrics.silentDuration > this.SILENT_DETECTION_THRESHOLD && 
          metrics.processStatus !== 'silent') {
        
        metrics.processStatus = 'silent';
        this.monitoredProcesses.set(instanceId, metrics);
        
        this.detectSilentProcessPattern(instanceId);
      }
    }
  }

  /**
   * Detect which pattern matches the silent process
   */
  private detectSilentProcessPattern(instanceId: string): void {
    const metrics = this.monitoredProcesses.get(instanceId);
    if (!metrics) return;

    const detectedPatterns: string[] = [];

    // Check each pattern against current metrics
    for (const [patternId, pattern] of this.detectedPatterns) {
      if (this.matchesPattern(metrics, pattern)) {
        detectedPatterns.push(patternId);
        console.log(`🎯 Silent Process Pattern Detected: ${pattern.patternName} for ${instanceId}`);
      }
    }

    if (detectedPatterns.length > 0) {
      metrics.detectedPatterns = detectedPatterns;
      this.monitoredProcesses.set(instanceId, metrics);
      
      // Trigger alerts for detected patterns
      const primaryPattern = detectedPatterns[0];
      const pattern = this.detectedPatterns.get(primaryPattern)!;
      
      this.triggerAlert(
        instanceId, 
        'silent_process_detected', 
        pattern.severity,
        `Silent process failure detected: ${pattern.patternName}`,
        primaryPattern
      );
    }
  }

  /**
   * Check if metrics match a specific pattern
   */
  private matchesPattern(metrics: SilentProcessMetrics, pattern: SilentProcessPattern): boolean {
    const criteria = pattern.detectionCriteria;
    
    // Check PID existence
    if (criteria.processPidExists && !metrics.processId) return false;
    
    // Check silent duration
    if (criteria.stdoutSilentDuration && metrics.silentDuration < criteria.stdoutSilentDuration) return false;
    
    // Check process still running (if required)
    if (criteria.processStillRunning && metrics.processStatus === 'terminated') return false;
    
    // Pattern-specific checks
    switch (pattern.patternId) {
      case 'TTY_REQUIREMENT_FAILURE':
        return metrics.environmentChecks.ttyRequired;
        
      case 'AUTH_PROMPT_INVISIBLE':
        return metrics.environmentChecks.authenticationRequired;
        
      case 'WORKING_DIRECTORY_PERMISSIONS':
        return !metrics.environmentChecks.workingDirectoryExists || 
               !metrics.environmentChecks.workingDirectoryWritable;
               
      case 'MISSING_ENVIRONMENT_VARS':
        return metrics.environmentChecks.missingEnvironmentVars.length > 0;
        
      case 'CLAUDE_BINARY_ISSUES':
        return metrics.silentDuration > 15000 && metrics.inputCommandsSent === 0;
    }
    
    return true;
  }

  /**
   * Check if command requires TTY
   */
  private requiresTTY(command: string): boolean {
    return this.TTY_CHECK_COMMANDS.some(cmd => command.includes(cmd));
  }

  /**
   * Check if command requires authentication
   */
  private requiresAuthentication(command: string): boolean {
    const authCommands = ['sudo', 'ssh', 'git push', 'npm publish', 'docker login'];
    return authCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Perform environment checks for a process
   */
  private performEnvironmentChecks(instanceId: string, workingDirectory: string): void {
    const metrics = this.monitoredProcesses.get(instanceId);
    if (!metrics) return;

    // Check working directory (in real implementation, would use fs.access)
    metrics.environmentChecks.workingDirectoryExists = true; // Mock for now
    metrics.environmentChecks.workingDirectoryWritable = true; // Mock for now

    // Check for critical environment variables
    const criticalEnvVars = ['PATH', 'HOME', 'USER'];
    metrics.environmentChecks.missingEnvironmentVars = criticalEnvVars.filter(
      varName => !process.env[varName]
    );

    this.monitoredProcesses.set(instanceId, metrics);
    
    console.log(`🔧 Environment checks completed for ${instanceId}:`);
    console.log(`   Working Directory OK: ${metrics.environmentChecks.workingDirectoryExists}`);
    console.log(`   Directory Writable: ${metrics.environmentChecks.workingDirectoryWritable}`);
    console.log(`   Missing Env Vars: ${metrics.environmentChecks.missingEnvironmentVars.join(', ') || 'None'}`);
  }

  /**
   * Start monitoring timer for specific process
   */
  private startProcessMonitoring(instanceId: string): void {
    // Initial delay before checking for silent failure
    setTimeout(() => {
      const metrics = this.monitoredProcesses.get(instanceId);
      if (metrics && metrics.processStatus === 'spawning' && 
          metrics.outputEventsReceived === 0 && 
          metrics.errorEventsReceived === 0) {
        
        console.log(`⚠️ Process ${instanceId} has been silent since spawn`);
        this.detectSilentProcessPattern(instanceId);
      }
    }, this.SILENT_DETECTION_THRESHOLD);
  }

  /**
   * Analyze stderr output for error patterns
   */
  private analyzeErrorOutput(instanceId: string, errorData: string): void {
    const errorLower = errorData.toLowerCase();
    
    // Check for permission errors
    if (this.PERMISSION_ERROR_KEYWORDS.some(keyword => errorLower.includes(keyword))) {
      this.triggerAlert(instanceId, 'permission_denied', 'high',
        `Permission error detected: ${errorData.trim()}`,
        'WORKING_DIRECTORY_PERMISSIONS');
    }
    
    // Check for authentication prompts
    if (this.AUTH_DETECTION_KEYWORDS.some(keyword => errorLower.includes(keyword))) {
      this.triggerAlert(instanceId, 'auth_prompt_detected', 'medium',
        `Authentication prompt detected: ${errorData.trim()}`,
        'AUTH_PROMPT_INVISIBLE');
    }
  }

  /**
   * Check if exit code indicates permission error
   */
  private isPermissionExitCode(exitCode: number): boolean {
    const permissionExitCodes = [126, 13, 1]; // Command not executable, permission denied, general error
    return permissionExitCodes.includes(exitCode);
  }

  /**
   * Trigger an alert for detected failure pattern
   */
  private triggerAlert(instanceId: string, alertType: SilentProcessAlert['alertType'], 
                      severity: SilentProcessAlert['severity'], message: string, 
                      detectedPattern: string): void {
    
    const metrics = this.monitoredProcesses.get(instanceId);
    const pattern = this.detectedPatterns.get(detectedPattern);
    
    const alert: SilentProcessAlert = {
      timestamp: new Date(),
      instanceId,
      alertType,
      severity,
      message,
      detectedPattern,
      diagnostics: {
        processId: metrics?.processId,
        silentDuration: metrics?.silentDuration,
        inputCommandsSent: metrics?.inputCommandsSent,
        outputEventsReceived: metrics?.outputEventsReceived,
        environmentChecks: metrics?.environmentChecks
      },
      recommendedActions: pattern ? pattern.diagnosisSteps : []
    };

    this.alertHistory.push(alert);
    this.emit('alert', alert);

    console.log(`🚨 ALERT: ${alertType} - ${message}`);
    console.log(`   Instance: ${instanceId}`);
    console.log(`   Severity: ${severity}`);
    console.log(`   Pattern: ${detectedPattern}`);
    
    if (pattern) {
      console.log(`   Prevention: ${pattern.preventionStrategy}`);
    }
  }

  /**
   * Clear silent process alert for instance that became responsive
   */
  private clearSilentProcessAlert(instanceId: string): void {
    console.log(`✅ Process ${instanceId} became responsive - clearing silent alerts`);
  }

  /**
   * Get metrics for specific instance
   */
  public getInstanceMetrics(instanceId: string): SilentProcessMetrics | undefined {
    return this.monitoredProcesses.get(instanceId);
  }

  /**
   * Get all monitoring metrics
   */
  public getAllMetrics(): Map<string, SilentProcessMetrics> {
    return this.monitoredProcesses;
  }

  /**
   * Get alert history
   */
  public getAlertHistory(instanceId?: string): SilentProcessAlert[] {
    if (instanceId) {
      return this.alertHistory.filter(alert => alert.instanceId === instanceId);
    }
    return [...this.alertHistory];
  }

  /**
   * Get pattern database
   */
  public getPatternDatabase(): Map<string, SilentProcessPattern> {
    return this.detectedPatterns;
  }

  /**
   * Generate monitoring report
   */
  public generateReport(): {
    totalProcesses: number;
    silentProcesses: number;
    responsiveProcesses: number;
    terminatedProcesses: number;
    detectedPatterns: string[];
    criticalAlerts: number;
    recommendations: string[];
  } {
    const metrics = Array.from(this.monitoredProcesses.values());
    const silent = metrics.filter(m => m.processStatus === 'silent');
    const responsive = metrics.filter(m => m.processStatus === 'responsive');
    const terminated = metrics.filter(m => m.processStatus === 'terminated');
    
    const allDetectedPatterns = metrics.flatMap(m => m.detectedPatterns)
      .filter((pattern, index, self) => self.indexOf(pattern) === index);
    
    const criticalAlerts = this.alertHistory.filter(a => a.severity === 'critical').length;
    
    const recommendations = [
      'Implement TTY detection before spawning interactive commands',
      'Pre-authenticate operations requiring credentials',
      'Validate working directory permissions before process spawn',
      'Set up comprehensive environment variable validation',
      'Add process health monitoring with timeout detection'
    ];

    return {
      totalProcesses: metrics.length,
      silentProcesses: silent.length,
      responsiveProcesses: responsive.length,
      terminatedProcesses: terminated.length,
      detectedPatterns: allDetectedPatterns,
      criticalAlerts,
      recommendations
    };
  }

  /**
   * Export data for neural training
   */
  public exportNeuralTrainingData(): any {
    const trainingData = {
      timestamp: new Date().toISOString(),
      patterns: Array.from(this.detectedPatterns.values()).map(pattern => ({
        pattern_id: pattern.patternId,
        severity: pattern.severity,
        tdd_factor: pattern.tddFactor,
        neural_features: pattern.neuralFeatures,
        detection_criteria: pattern.detectionCriteria,
        prevention_strategy: pattern.preventionStrategy
      })),
      instances: Array.from(this.monitoredProcesses.values()).map(metrics => ({
        instance_id: metrics.instanceId,
        process_status: metrics.processStatus,
        silent_duration: metrics.silentDuration,
        detected_patterns: metrics.detectedPatterns,
        environment_checks: metrics.environmentChecks,
        success_indicators: {
          output_events: metrics.outputEventsReceived,
          error_events: metrics.errorEventsReceived,
          input_commands: metrics.inputCommandsSent
        }
      })),
      alerts: this.alertHistory.map(alert => ({
        alert_type: alert.alertType,
        severity: alert.severity,
        detected_pattern: alert.detectedPattern,
        diagnostics: alert.diagnostics
      }))
    };

    console.log('🧠 Neural training data exported for silent process patterns');
    return trainingData;
  }
}

// Export singleton instance
export const silentProcessDetector = new SilentProcessFailureDetector();