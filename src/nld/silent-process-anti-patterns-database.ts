/**
 * Silent Process Anti-Patterns Database
 * 
 * Comprehensive database of anti-patterns for processes that spawn successfully
 * but produce no output due to TTY requirements, authentication prompts,
 * permission issues, or environment problems.
 * 
 * This database complements the existing NLD system with patterns specific
 * to silent process failures.
 */

export interface SilentProcessAntiPattern {
  patternId: string;
  patternName: string;
  category: 'tty_requirement' | 'authentication' | 'permissions' | 'environment' | 'binary_issues' | 'resource_limits';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detectionCriteria: {
    processSpawns: boolean;
    validPID: boolean;
    stdioConfigured: boolean;
    inputForwardingWorks: boolean;
    noStdoutOutput: boolean;
    noStderrOutput: boolean;
    processStillRunning: boolean;
    silentDurationMs: number;
  };
  commonSymptoms: string[];
  rootCauses: string[];
  affectedCommands: string[];
  diagnosticSteps: string[];
  preventionStrategies: string[];
  recoveryActions: string[];
  tddPreventionTests: string[];
  realWorldExamples: Array<{
    scenario: string;
    command: string;
    environment: string;
    expectedBehavior: string;
    actualBehavior: string;
    userImpact: string;
    solution: string;
  }>;
  neuralFeatures: Record<string, any>;
  detectionConfidence: number; // 0.0 to 1.0
}

export class SilentProcessAntiPatternsDatabase {
  private patterns: Map<string, SilentProcessAntiPattern> = new Map();
  private patternFrequency: Map<string, number> = new Map();
  private detectionHistory: Array<{
    timestamp: Date;
    patternId: string;
    instanceId: string;
    confidence: number;
    resolved: boolean;
  }> = [];

  constructor() {
    this.initializeAntiPatterns();
  }

  private initializeAntiPatterns(): void {
    // Pattern 1: Interactive Editor TTY Requirement
    this.addPattern({
      patternId: 'INTERACTIVE_EDITOR_TTY_REQUIREMENT',
      patternName: 'Interactive Editor Requires TTY',
      category: 'tty_requirement',
      severity: 'high',
      description: 'Text editors like vi, nano require TTY for display and input, fail silently with pipes',
      detectionCriteria: {
        processSpawns: true,
        validPID: true,
        stdioConfigured: true,
        inputForwardingWorks: true,
        noStdoutOutput: true,
        noStderrOutput: true,
        processStillRunning: true,
        silentDurationMs: 5000
      },
      commonSymptoms: [
        'vi or nano command appears to hang',
        'Process PID exists and shows running status',
        'No terminal display or cursor appears',
        'Input commands sent but no visual feedback',
        'Process CPU usage minimal (waiting state)'
      ],
      rootCauses: [
        'Text editors require TTY for ncurses/termios control',
        'Pipe stdio prevents terminal initialization',
        'Editor cannot detect terminal capabilities',
        'Missing isatty() check causing initialization failure'
      ],
      affectedCommands: ['vi', 'vim', 'nano', 'emacs -nw', 'less', 'more'],
      diagnosticSteps: [
        'Check if command is interactive editor',
        'Verify process spawn used stdio pipes not pty',
        'Test same command with pty allocation',
        'Monitor for termios/ncurses library calls',
        'Check process file descriptors for TTY detection'
      ],
      preventionStrategies: [
        'Detect TTY-required commands before spawn',
        'Use pty instead of pipes for interactive tools',
        'Provide alternative non-interactive command variants',
        'Add TTY requirement detection to command parser',
        'Create command compatibility matrix'
      ],
      recoveryActions: [
        'Terminate current process and respawn with pty',
        'Suggest non-interactive alternatives (cat instead of less)',
        'Provide inline editing alternatives',
        'Switch to web-based editor interface'
      ],
      tddPreventionTests: [
        'Test interactive commands with pipe stdio detection',
        'Verify TTY requirement detection accuracy',
        'Test pty allocation for TTY-required commands',
        'Validate command categorization system',
        'Test fallback mechanisms for interactive commands'
      ],
      realWorldExamples: [
        {
          scenario: 'User tries to edit file with vi in Claude terminal',
          command: 'vi package.json',
          environment: 'stdio: ["pipe", "pipe", "pipe"]',
          expectedBehavior: 'vi opens with file content, cursor control available',
          actualBehavior: 'Process spawns but no output appears, appears hung',
          userImpact: 'Cannot edit files, thinks system is broken',
          solution: 'Detect vi command and spawn with pty, or suggest non-interactive alternative'
        },
        {
          scenario: 'User runs less to view log file',
          command: 'less /var/log/messages',
          environment: 'Piped stdio in web terminal',
          expectedBehavior: 'Paginated file view with navigation controls',
          actualBehavior: 'Silent process, no file content displayed',
          userImpact: 'Cannot view file contents, no error feedback',
          solution: 'Use cat with head/tail for piped environments'
        }
      ],
      neuralFeatures: {
        interactive_command: true,
        requires_tty: true,
        ncurses_dependent: true,
        terminal_control_needed: true,
        visual_interface: true,
        stdio_pipe_incompatible: true
      },
      detectionConfidence: 0.95
    });

    // Pattern 2: SSH Authentication Prompt Hidden
    this.addPattern({
      patternId: 'SSH_AUTH_PROMPT_HIDDEN',
      patternName: 'SSH Authentication Prompt Not Visible',
      category: 'authentication',
      severity: 'high',
      description: 'SSH client waits for password/key confirmation but prompts not visible in piped mode',
      detectionCriteria: {
        processSpawns: true,
        validPID: true,
        stdioConfigured: true,
        inputForwardingWorks: true,
        noStdoutOutput: true,
        noStderrOutput: false, // SSH may write to stderr
        processStillRunning: true,
        silentDurationMs: 10000
      },
      commonSymptoms: [
        'SSH command hangs after connection initiation',
        'No password prompt visible to user',
        'Process waiting for stdin input',
        'Network connection established but no progress',
        'High network activity then silence'
      ],
      rootCauses: [
        'SSH writes password prompts to controlling terminal not stderr',
        'Host key verification prompts go to TTY',
        'Interactive authentication requires terminal control',
        'SSH agent forwarding needs TTY for confirmation'
      ],
      affectedCommands: ['ssh', 'scp', 'sftp', 'rsync with ssh', 'git remote operations'],
      diagnosticSteps: [
        'Check if SSH command requires interactive authentication',
        'Monitor network connections for SSH handshake completion',
        'Test with SSH keys vs password authentication',
        'Check SSH config for interactive prompts',
        'Monitor process state for stdin blocking'
      ],
      preventionStrategies: [
        'Pre-configure SSH keys for passwordless authentication',
        'Use SSH config to disable interactive prompts',
        'Implement credential helper for SSH operations',
        'Detect SSH commands and provide authentication UI',
        'Use SSH with -o BatchMode=yes for non-interactive'
      ],
      recoveryActions: [
        'Kill SSH process and retry with proper authentication',
        'Provide SSH key setup guidance',
        'Implement web-based SSH authentication flow',
        'Switch to HTTPS for git operations'
      ],
      tddPreventionTests: [
        'Test SSH operations with and without keys',
        'Verify SSH batch mode detection',
        'Test SSH authentication timeout handling',
        'Validate SSH credential helper integration',
        'Test network timeout scenarios for SSH'
      ],
      realWorldExamples: [
        {
          scenario: 'User runs git push to new remote repository',
          command: 'git push origin main',
          environment: 'SSH key not configured, piped stdio',
          expectedBehavior: 'Password prompt appears, user can authenticate',
          actualBehavior: 'Process hangs, no visible prompt, appears broken',
          userImpact: 'Cannot push code, thinks git is broken',
          solution: 'Setup SSH keys or switch to HTTPS with credential helper'
        },
        {
          scenario: 'User connects to remote server via SSH',
          command: 'ssh user@example.com',
          environment: 'First connection, host key verification needed',
          expectedBehavior: 'Host key prompt, then password prompt',
          actualBehavior: 'Connection hangs after initial handshake',
          userImpact: 'Cannot connect to server, no error feedback',
          solution: 'Pre-accept host keys or provide TTY for verification'
        }
      ],
      neuralFeatures: {
        network_authentication: true,
        ssh_protocol: true,
        interactive_prompts: true,
        credential_required: true,
        host_key_verification: true,
        tty_prompt_dependency: true
      },
      detectionConfidence: 0.90
    });

    // Pattern 3: Sudo Password Prompt Invisible
    this.addPattern({
      patternId: 'SUDO_PASSWORD_PROMPT_INVISIBLE',
      patternName: 'Sudo Password Prompt Not Visible',
      category: 'authentication',
      severity: 'critical',
      description: 'Sudo command waits for password but prompt is not displayed in non-TTY environment',
      detectionCriteria: {
        processSpawns: true,
        validPID: true,
        stdioConfigured: true,
        inputForwardingWorks: true,
        noStdoutOutput: true,
        noStderrOutput: true,
        processStillRunning: true,
        silentDurationMs: 8000
      },
      commonSymptoms: [
        'sudo command appears to hang immediately',
        'No password prompt displayed',
        'Process waiting for input on stdin',
        'Command execution never proceeds',
        'System appears unresponsive to elevated commands'
      ],
      rootCauses: [
        'sudo requires TTY for secure password input',
        'PAM configuration enforces TTY requirement',
        'Security policy prevents non-interactive sudo',
        'sudo compiled with --disable-root-sudo affecting behavior'
      ],
      affectedCommands: ['sudo', 'su', 'pkexec', 'sudo -s', 'sudo su -'],
      diagnosticSteps: [
        'Check sudoers configuration for NOPASSWD entries',
        'Test sudo -n (non-interactive) flag behavior',
        'Check PAM configuration for sudo',
        'Monitor process for password prompt attempts',
        'Verify user sudo privileges'
      ],
      preventionStrategies: [
        'Configure NOPASSWD sudo for specific commands',
        'Use sudo -n flag to detect authentication requirements',
        'Implement secure credential passing mechanisms',
        'Provide alternative privilege escalation methods',
        'Pre-authenticate sudo sessions before command execution'
      ],
      recoveryActions: [
        'Configure NOPASSWD for common development commands',
        'Use container environments with appropriate privileges',
        'Implement web-based privilege escalation flow',
        'Run commands in user context when possible'
      ],
      tddPreventionTests: [
        'Test sudo operations with NOPASSWD configuration',
        'Verify sudo authentication requirement detection',
        'Test privilege escalation fallback mechanisms',
        'Validate command privilege requirements',
        'Test timeout handling for authentication prompts'
      ],
      realWorldExamples: [
        {
          scenario: 'User runs npm install -g to install global package',
          command: 'sudo npm install -g typescript',
          environment: 'sudo requires password, no TTY available',
          expectedBehavior: 'Password prompt appears, package installs after authentication',
          actualBehavior: 'Command hangs indefinitely, no visible prompt',
          userImpact: 'Cannot install global packages, development workflow blocked',
          solution: 'Configure NOPASSWD for npm global installs or use user-local installs'
        },
        {
          scenario: 'User needs to edit system configuration file',
          command: 'sudo vi /etc/hosts',
          environment: 'Piped stdio environment',
          expectedBehavior: 'Password prompt, then file opens in editor',
          actualBehavior: 'Process hangs at sudo authentication step',
          userImpact: 'Cannot edit system files, appears as system failure',
          solution: 'Use web-based file editor with proper authentication flow'
        }
      ],
      neuralFeatures: {
        privilege_escalation: true,
        password_authentication: true,
        security_prompt: true,
        tty_security_requirement: true,
        pam_authentication: true,
        stdin_blocking: true
      },
      detectionConfidence: 0.95
    });

    // Pattern 4: Working Directory Permission Denial
    this.addPattern({
      patternId: 'WORKING_DIRECTORY_PERMISSION_DENIAL',
      patternName: 'Process Cannot Access Working Directory',
      category: 'permissions',
      severity: 'critical',
      description: 'Process spawns but cannot read/execute in specified working directory due to permission restrictions',
      detectionCriteria: {
        processSpawns: true,
        validPID: false, // May terminate quickly
        stdioConfigured: true,
        inputForwardingWorks: false,
        noStdoutOutput: true,
        noStderrOutput: false, // Usually generates error messages
        processStillRunning: false,
        silentDurationMs: 1000 // Quick failure
      },
      commonSymptoms: [
        'Process terminates immediately after spawn',
        'Permission denied errors in stderr',
        'Working directory access failures',
        'Exit code 126 (command not executable) or 13 (permission denied)',
        'File system operation failures'
      ],
      rootCauses: [
        'Working directory mounted with noexec flag',
        'Insufficient read/execute permissions on directory',
        'SELinux or AppArmor policy restrictions',
        'Container volume mount permission issues',
        'Network filesystem access denied'
      ],
      affectedCommands: ['cd', 'ls', 'pwd', 'any command with cwd specified'],
      diagnosticSteps: [
        'Check directory existence and permissions',
        'Test directory access with same user context',
        'Verify mount point restrictions (noexec, etc.)',
        'Check SELinux/AppArmor contexts and policies',
        'Test file system operations in directory'
      ],
      preventionStrategies: [
        'Validate directory permissions before process spawn',
        'Use accessible working directories for process execution',
        'Check mount flags before directory selection',
        'Implement directory access testing in pre-spawn validation',
        'Provide clear error messages for permission issues'
      ],
      recoveryActions: [
        'Switch to user-accessible working directory',
        'Fix directory permissions if possible',
        'Use alternative directory with proper access',
        'Provide permission escalation options when appropriate'
      ],
      tddPreventionTests: [
        'Test directory permission validation before spawn',
        'Verify error handling for permission denied scenarios',
        'Test working directory fallback mechanisms',
        'Validate mount restriction detection',
        'Test container permission mapping'
      ],
      realWorldExamples: [
        {
          scenario: 'Claude process spawned in restricted directory',
          command: 'pwd',
          environment: '/tmp directory with noexec mount flag',
          expectedBehavior: 'Shows current working directory path',
          actualBehavior: 'Process fails with permission error',
          userImpact: 'Cannot execute any commands, system appears broken',
          solution: 'Spawn process in user-accessible directory like ~/workspace'
        },
        {
          scenario: 'Container volume mount permission mismatch',
          command: 'ls -la',
          environment: 'Docker volume with incorrect user mapping',
          expectedBehavior: 'Lists directory contents with permissions',
          actualBehavior: 'Permission denied error, no output',
          userImpact: 'Cannot access project files, development blocked',
          solution: 'Fix container user mapping or use bind mounts'
        }
      ],
      neuralFeatures: {
        permission_error: true,
        quick_termination: true,
        directory_access_failure: true,
        mount_restrictions: true,
        security_policy_block: true,
        filesystem_error: true
      },
      detectionConfidence: 0.90
    });

    // Pattern 5: Environment Variable Dependencies Missing
    this.addPattern({
      patternId: 'MISSING_CRITICAL_ENVIRONMENT_VARIABLES',
      patternName: 'Critical Environment Variables Missing',
      category: 'environment',
      severity: 'medium',
      description: 'Process depends on environment variables that are not set, causing initialization failure or hang',
      detectionCriteria: {
        processSpawns: true,
        validPID: true,
        stdioConfigured: true,
        inputForwardingWorks: true,
        noStdoutOutput: true,
        noStderrOutput: true,
        processStillRunning: true,
        silentDurationMs: 7000
      },
      commonSymptoms: [
        'Process starts but never produces output',
        'Initialization appears to hang',
        'Configuration loading phase never completes',
        'Tool-specific functionality unavailable',
        'Silent failure without error messages'
      ],
      rootCauses: [
        'PATH missing critical directories for tool execution',
        'HOME variable not set preventing config file access',
        'Tool-specific variables missing (JAVA_HOME, NODE_PATH, etc.)',
        'Locale/language variables causing character encoding issues',
        'Authentication tokens not available in environment'
      ],
      affectedCommands: ['java', 'node', 'python', 'git', 'docker', 'kubectl'],
      diagnosticSteps: [
        'Compare current environment with working process instances',
        'Check tool documentation for required environment variables',
        'Monitor environment variable access during process startup',
        'Test with minimal vs comprehensive environment setup',
        'Check for missing PATH components'
      ],
      preventionStrategies: [
        'Validate critical environment variables before process spawn',
        'Provide comprehensive environment setup for development tools',
        'Implement environment variable requirement detection',
        'Create environment profiles for different tool categories',
        'Add environment validation to process health checks'
      ],
      recoveryActions: [
        'Set missing environment variables and restart process',
        'Use tool-specific environment setup scripts',
        'Provide environment configuration guidance',
        'Fall back to tools with minimal environment requirements'
      ],
      tddPreventionTests: [
        'Test process behavior with minimal environment',
        'Verify environment variable requirement detection',
        'Test environment setup and validation functions',
        'Validate environment profile completeness',
        'Test fallback behavior for missing variables'
      ],
      realWorldExamples: [
        {
          scenario: 'Java application fails to start due to missing JAVA_HOME',
          command: 'java -jar app.jar',
          environment: 'JAVA_HOME not set, PATH includes java binary',
          expectedBehavior: 'Java application starts and shows output',
          actualBehavior: 'Process hangs during initialization',
          userImpact: 'Java applications cannot run, appears as tool failure',
          solution: 'Set JAVA_HOME environment variable before spawning'
        },
        {
          scenario: 'Node.js process cannot find modules due to missing NODE_PATH',
          command: 'node app.js',
          environment: 'Global node modules not in NODE_PATH',
          expectedBehavior: 'Node application starts normally',
          actualBehavior: 'Silent failure during module resolution',
          userImpact: 'Node applications fail silently, difficult to debug',
          solution: 'Configure NODE_PATH or use local node_modules'
        }
      ],
      neuralFeatures: {
        environment_dependency: true,
        configuration_loading_hang: true,
        tool_initialization_failure: true,
        missing_path_components: true,
        configuration_access_failure: true,
        silent_startup_failure: true
      },
      detectionConfidence: 0.75
    });

    console.log(`🔍 Silent Process Anti-Patterns Database initialized with ${this.patterns.size} patterns`);
  }

  private addPattern(pattern: SilentProcessAntiPattern): void {
    this.patterns.set(pattern.patternId, pattern);
    this.patternFrequency.set(pattern.patternId, 0);
  }

  /**
   * Detect anti-patterns in process behavior
   */
  public detectAntiPatterns(
    processInfo: {
      command: string;
      pid?: number;
      exitCode?: number;
      silentDuration: number;
      stdoutReceived: boolean;
      stderrReceived: boolean;
      inputSent: boolean;
      stillRunning: boolean;
    },
    context?: any
  ): Array<{
    pattern: SilentProcessAntiPattern;
    confidence: number;
    matchedCriteria: string[];
  }> {
    const detectedPatterns: Array<{
      pattern: SilentProcessAntiPattern;
      confidence: number;
      matchedCriteria: string[];
    }> = [];

    for (const pattern of this.patterns.values()) {
      const detection = this.evaluatePattern(pattern, processInfo, context);
      
      if (detection.confidence >= 0.7) { // Threshold for pattern detection
        detectedPatterns.push({
          pattern,
          confidence: detection.confidence,
          matchedCriteria: detection.matchedCriteria
        });
        
        // Update frequency
        const currentFreq = this.patternFrequency.get(pattern.patternId) || 0;
        this.patternFrequency.set(pattern.patternId, currentFreq + 1);
      }
    }

    return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  private evaluatePattern(
    pattern: SilentProcessAntiPattern,
    processInfo: any,
    context?: any
  ): { confidence: number; matchedCriteria: string[] } {
    let confidence = 0;
    const matchedCriteria: string[] = [];
    const criteria = pattern.detectionCriteria;

    // Check basic criteria
    if (criteria.processSpawns && processInfo.pid) {
      confidence += 0.1;
      matchedCriteria.push('process_spawned');
    }

    if (criteria.validPID && processInfo.pid && processInfo.pid > 0) {
      confidence += 0.1;
      matchedCriteria.push('valid_pid');
    }

    if (criteria.noStdoutOutput && !processInfo.stdoutReceived) {
      confidence += 0.2;
      matchedCriteria.push('no_stdout');
    }

    if (criteria.silentDurationMs && processInfo.silentDuration >= criteria.silentDurationMs) {
      confidence += 0.2;
      matchedCriteria.push('silent_duration_exceeded');
    }

    if (criteria.processStillRunning && processInfo.stillRunning) {
      confidence += 0.1;
      matchedCriteria.push('process_still_running');
    }

    // Command-specific detection
    if (pattern.affectedCommands.some(cmd => processInfo.command.includes(cmd))) {
      confidence += 0.2;
      matchedCriteria.push('affected_command_detected');
    }

    // Pattern-specific confidence adjustments
    confidence += this.calculatePatternSpecificConfidence(pattern, processInfo, context);

    return {
      confidence: Math.min(confidence, 1.0),
      matchedCriteria
    };
  }

  private calculatePatternSpecificConfidence(
    pattern: SilentProcessAntiPattern,
    processInfo: any,
    context?: any
  ): number {
    let boost = 0;

    switch (pattern.patternId) {
      case 'INTERACTIVE_EDITOR_TTY_REQUIREMENT':
        if (['vi', 'vim', 'nano', 'emacs'].some(editor => processInfo.command.includes(editor))) {
          boost += 0.2;
        }
        break;

      case 'SSH_AUTH_PROMPT_HIDDEN':
        if (processInfo.command.includes('ssh') && processInfo.silentDuration > 8000) {
          boost += 0.15;
        }
        break;

      case 'SUDO_PASSWORD_PROMPT_INVISIBLE':
        if (processInfo.command.startsWith('sudo') && !processInfo.stdoutReceived) {
          boost += 0.25;
        }
        break;

      case 'WORKING_DIRECTORY_PERMISSION_DENIAL':
        if (processInfo.exitCode && [126, 13].includes(processInfo.exitCode)) {
          boost += 0.3;
        }
        break;

      case 'MISSING_CRITICAL_ENVIRONMENT_VARIABLES':
        if (['java', 'node', 'python'].some(tool => processInfo.command.includes(tool))) {
          boost += 0.1;
        }
        break;
    }

    return boost;
  }

  public getPattern(patternId: string): SilentProcessAntiPattern | undefined {
    return this.patterns.get(patternId);
  }

  public getPatternsByCategory(category: SilentProcessAntiPattern['category']): SilentProcessAntiPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category);
  }

  public getPatternsBySeverity(severity: SilentProcessAntiPattern['severity']): SilentProcessAntiPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.severity === severity);
  }

  public getAllPatterns(): SilentProcessAntiPattern[] {
    return Array.from(this.patterns.values());
  }

  public recordPatternDetection(patternId: string, instanceId: string, confidence: number): void {
    this.detectionHistory.push({
      timestamp: new Date(),
      patternId,
      instanceId,
      confidence,
      resolved: false
    });

    console.log(`📊 Pattern detection recorded: ${patternId} for instance ${instanceId} (confidence: ${confidence.toFixed(2)})`);
  }

  public generateStatisticsReport(): {
    totalPatterns: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    mostFrequent: Array<{ patternId: string; frequency: number; pattern: SilentProcessAntiPattern }>;
    detectionHistory: number;
    averageConfidence: number;
  } {
    const patterns = Array.from(this.patterns.values());
    
    const byCategory = patterns.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = patterns.reduce((acc, p) => {
      acc[p.severity] = (acc[p.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequent = Array.from(this.patternFrequency.entries())
      .map(([patternId, frequency]) => ({
        patternId,
        frequency,
        pattern: this.patterns.get(patternId)!
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const avgConfidence = this.detectionHistory.length > 0
      ? this.detectionHistory.reduce((sum, d) => sum + d.confidence, 0) / this.detectionHistory.length
      : 0;

    return {
      totalPatterns: patterns.length,
      byCategory,
      bySeverity,
      mostFrequent,
      detectionHistory: this.detectionHistory.length,
      averageConfidence
    };
  }

  public exportForNeuralTraining(): any {
    return {
      timestamp: new Date().toISOString(),
      patterns: Array.from(this.patterns.values()).map(pattern => ({
        pattern_id: pattern.patternId,
        category: pattern.category,
        severity: pattern.severity,
        detection_criteria: pattern.detectionCriteria,
        neural_features: pattern.neuralFeatures,
        detection_confidence: pattern.detectionConfidence,
        affected_commands: pattern.affectedCommands,
        prevention_strategies: pattern.preventionStrategies,
        frequency: this.patternFrequency.get(pattern.patternId) || 0
      })),
      detection_history: this.detectionHistory,
      statistics: this.generateStatisticsReport()
    };
  }
}

// Export singleton instance
export const silentProcessAntiPatternsDB = new SilentProcessAntiPatternsDatabase();