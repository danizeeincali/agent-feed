/**
 * NLD Working Directory Pattern Detector
 * Monitors hardcoded working directory configurations and detects
 * dynamic directory spawning failures in Claude instance creation
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WorkingDirectoryFailure {
  recordId: string;
  timestamp: string;
  taskContext: {
    userExpectation: string;
    buttonType: string;
    expectedDirectory: string;
    actualDirectory: string;
  };
  failurePattern: {
    type: 'HARDCODED_WORKING_DIR';
    location: string;
    lineNumber: number;
    code: string;
    antiPattern: string;
  };
  userFeedback: {
    reportedIssue: string;
    correctedSolution?: string;
  };
  effectivenessScore: number;
  tddFactor: boolean;
  classification: string;
}

export class WorkingDirectoryPatternDetector {
  private patterns: WorkingDirectoryFailure[] = [];
  private dbPath: string;

  constructor(dbPath = '/workspaces/agent-feed/src/nld/patterns/working-directory-failures.json') {
    this.dbPath = dbPath;
    this.loadExistingPatterns();
  }

  /**
   * Detect trigger conditions for working directory failures
   */
  detectTriggerConditions(userFeedback: string): boolean {
    const triggers = [
      'prod/claude button spawns in wrong directory',
      'hardcoded workingDir prevents dynamic directory',
      'button type to directory mapping failures',
      'expected prod/ subdirectory but spawned in parent',
      'working directory configuration incorrect'
    ];
    
    return triggers.some(trigger => 
      userFeedback.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  /**
   * Monitor simple-backend.js for hardcoded working directory pattern
   */
  async monitorBackendFile(): Promise<WorkingDirectoryFailure | null> {
    const backendPath = '/workspaces/agent-feed/simple-backend.js';
    
    try {
      const content = await fs.promises.readFile(backendPath, 'utf-8');
      const lines = content.split('\n');
      
      // Search for hardcoded workingDir assignment
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Detect hardcoded working directory pattern
        if (line.includes('workingDir') && line.includes('=') && line.includes('/workspaces/agent-feed')) {
          return this.createFailureRecord({
            location: backendPath,
            lineNumber,
            code: line.trim(),
            detectedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring backend file:', error);
    }
    
    return null;
  }

  /**
   * Create comprehensive failure record for working directory misconfiguration
   */
  private createFailureRecord(detection: {
    location: string;
    lineNumber: number;
    code: string;
    detectedAt: string;
  }): WorkingDirectoryFailure {
    const recordId = `wd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      recordId,
      timestamp: detection.detectedAt,
      taskContext: {
        userExpectation: 'prod/claude button should spawn Claude process in prod/ subdirectory',
        buttonType: 'prod/claude',
        expectedDirectory: '/workspaces/agent-feed/prod',
        actualDirectory: '/workspaces/agent-feed'
      },
      failurePattern: {
        type: 'HARDCODED_WORKING_DIR',
        location: detection.location,
        lineNumber: detection.lineNumber,
        code: detection.code,
        antiPattern: 'const workingDir = \'/workspaces/agent-feed\';'
      },
      userFeedback: {
        reportedIssue: 'User expects prod/claude button to spawn Claude in prod/ subdirectory but actually spawns in parent directory',
        correctedSolution: 'Make workingDir dynamic based on button type: prod -> /workspaces/agent-feed/prod'
      },
      effectivenessScore: 0.15, // Low effectiveness due to hardcoded values
      tddFactor: false, // No TDD used in original implementation
      classification: 'DIRECTORY_CONFIGURATION_HARDCODING'
    };
  }

  /**
   * Capture real-time failure pattern when user reports directory spawning issue
   */
  async captureFailurePattern(
    userFeedback: string,
    taskContext: {
      originalTask: string;
      claudeSolution: string;
      confidenceLevel: number;
    }
  ): Promise<string> {
    if (!this.detectTriggerConditions(userFeedback)) {
      return '';
    }

    // Monitor backend file for the specific pattern
    const failure = await this.monitorBackendFile();
    if (!failure) {
      return '';
    }

    // Update with user context
    failure.userFeedback.reportedIssue = userFeedback;
    failure.effectivenessScore = this.calculateEffectivenessScore(
      taskContext.confidenceLevel,
      false // TDD not used
    );

    // Store the pattern
    this.patterns.push(failure);
    await this.savePatterns();

    return failure.recordId;
  }

  /**
   * Calculate effectiveness score based on user success rate and TDD factor
   */
  private calculateEffectivenessScore(claudeConfidence: number, tddUsed: boolean): number {
    // Formula: (User Success Rate / Claude Confidence) * TDD Factor
    const userSuccessRate = 0.1; // 10% - user reported failure
    const tddFactor = tddUsed ? 1.0 : 0.5; // TDD doubles effectiveness
    
    return (userSuccessRate / (claudeConfidence / 100)) * tddFactor;
  }

  /**
   * Get failure patterns by classification
   */
  getPatternsByClassification(classification: string): WorkingDirectoryFailure[] {
    return this.patterns.filter(p => p.classification === classification);
  }

  /**
   * Get all working directory failure patterns
   */
  getAllPatterns(): WorkingDirectoryFailure[] {
    return [...this.patterns];
  }

  /**
   * Export neural training data for claude-flow integration
   */
  async exportNeuralTrainingData(): Promise<{
    patternData: any[];
    exportPath: string;
  }> {
    const trainingData = this.patterns.map(pattern => ({
      input: {
        taskType: 'directory-spawning',
        buttonType: pattern.taskContext.buttonType,
        codePattern: pattern.failurePattern.code,
        antiPatternType: pattern.failurePattern.type
      },
      output: {
        failureProbability: 1.0 - pattern.effectivenessScore,
        recommendedFix: pattern.userFeedback.correctedSolution,
        preventionStrategy: 'Use dynamic directory mapping based on button type'
      },
      metadata: {
        recordId: pattern.recordId,
        classification: pattern.classification,
        tddFactor: pattern.tddFactor
      }
    }));

    const exportPath = '/workspaces/agent-feed/neural-exports/working-directory-patterns.json';
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(exportPath), { recursive: true });
    
    // Write training data
    await fs.promises.writeFile(
      exportPath, 
      JSON.stringify(trainingData, null, 2)
    );

    return {
      patternData: trainingData,
      exportPath
    };
  }

  /**
   * Load existing patterns from database
   */
  private async loadExistingPatterns(): Promise<void> {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = await fs.promises.readFile(this.dbPath, 'utf-8');
        this.patterns = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading existing patterns:', error);
      this.patterns = [];
    }
  }

  /**
   * Save patterns to database
   */
  private async savePatterns(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      await fs.promises.writeFile(
        this.dbPath, 
        JSON.stringify(this.patterns, null, 2)
      );
    } catch (error) {
      console.error('Error saving patterns:', error);
    }
  }

  /**
   * Generate anti-pattern database for prevention
   */
  generateAntiPatterns(): {
    patterns: Array<{
      name: string;
      description: string;
      antiPattern: string;
      solution: string;
      preventionStrategy: string;
    }>;
  } {
    return {
      patterns: [
        {
          name: 'HARDCODED_WORKING_DIRECTORY',
          description: 'Working directory hardcoded to parent instead of button-specific subdirectory',
          antiPattern: "const workingDir = '/workspaces/agent-feed';",
          solution: "const workingDir = getWorkingDirectoryByButtonType(instanceType);",
          preventionStrategy: 'Implement dynamic directory mapping based on button type (prod -> prod/, dev -> dev/, etc.)'
        },
        {
          name: 'MISSING_BUTTON_TYPE_MAPPING',
          description: 'No mapping between UI button types and working directories',
          antiPattern: 'Single hardcoded directory for all instance types',
          solution: 'Create BUTTON_DIRECTORY_MAP with type-specific paths',
          preventionStrategy: 'Always map UI elements to their expected working contexts'
        },
        {
          name: 'STATIC_DIRECTORY_CONFIGURATION',
          description: 'Directory configuration cannot adapt to different deployment contexts',
          antiPattern: 'Fixed paths that ignore button context and user expectations',
          solution: 'Dynamic configuration based on instance type and user context',
          preventionStrategy: 'Use configuration-driven directory selection with fallback defaults'
        }
      ]
    };
  }
}