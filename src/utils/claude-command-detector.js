/**
 * SPARC Claude CLI Command Detector
 * Prevents terminal hangs by detecting problematic Claude CLI commands
 */

class ClaudeCommandDetector {
  constructor(options = {}) {
    this.options = {
      learningEnabled: options.learningEnabled !== false,
      helpMessageEnabled: options.helpMessageEnabled !== false,
      commandHistorySize: options.commandHistorySize || 100,
      ...options
    };
    
    // Command patterns that cause hangs
    this.hangPatterns = new Set([
      'claude\\r?\\n?$',              // Bare 'claude' command
      'cd\\s+\\w+\\s*&&\\s*claude\\s*[\\r\\n]*$',  // cd && claude patterns
      'claude\\s*$',                  // Claude with only whitespace
    ]);
    
    // Safe command patterns
    this.safePatterns = new Set([
      'claude\\s+--help',
      'claude\\s+--version',
      'claude\\s+chat',
      'claude\\s+code',
      'claude\\s+auth',
      'claude\\s+project',
      'claude\\s+--.*',              // Any claude with flags
    ]);
    
    // Learning database
    this.learnedPatterns = {
      hangPatterns: [],
      safePatterns: [],
      commandHistory: [],
      statistics: {
        totalCommands: 0,
        hangsPrevented: 0,
        safeCommandsPassed: 0,
        learningAccuracy: 0
      }
    };
    
    // Load existing patterns if available
    this.loadLearnedPatterns();
  }
  
  /**
   * Check if a command would cause Claude CLI to hang
   */
  isIncompleteCommand(command) {
    const trimmedCommand = command.trim();
    
    // Quick checks for known problematic patterns
    const knownHangPatterns = [
      /^claude\s*[\r\n]*$/,                    // Just 'claude'
      /^cd\s+\w+\s*&&\s*claude\s*[\r\n]*$/,   // cd && claude
      /^claude\s*$/,                           // Claude with whitespace only
    ];
    
    // Check against known hang patterns
    for (const pattern of knownHangPatterns) {
      if (pattern.test(trimmedCommand)) {
        this.recordHangPrevention(command);
        return true;
      }
    }
    
    // Check against learned hang patterns
    for (const pattern of this.learnedPatterns.hangPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(trimmedCommand)) {
          this.recordHangPrevention(command);
          return true;
        }
      } catch (error) {
        console.error('Invalid learned pattern:', pattern, error);
      }
    }
    
    // Check if it's a known safe pattern
    const knownSafePatterns = [
      /^claude\s+--help/,
      /^claude\s+--version/,
      /^claude\s+chat/,
      /^claude\s+code/,
      /^claude\s+auth/,
      /^claude\s+project/,
      /^claude\s+--\w+/,                       // Any flag
    ];
    
    for (const pattern of knownSafePatterns) {
      if (pattern.test(trimmedCommand)) {
        this.recordSafeCommand(command);
        return false;
      }
    }
    
    // If no definitive match, err on the side of caution for bare 'claude'
    if (/^claude\s*$/.test(trimmedCommand)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Process command for learning purposes
   */
  processCommand(command) {
    this.learnedPatterns.statistics.totalCommands++;
    
    // Add to command history
    this.learnedPatterns.commandHistory.push({
      command,
      timestamp: Date.now(),
      wasHang: this.isIncompleteCommand(command)
    });
    
    // Trim history if too large
    if (this.learnedPatterns.commandHistory.length > this.options.commandHistorySize) {
      this.learnedPatterns.commandHistory = this.learnedPatterns.commandHistory.slice(-this.options.commandHistorySize);
    }
    
    // Update learning accuracy
    this.updateLearningAccuracy();
  }
  
  /**
   * Get helpful message for problematic commands
   */
  getHelpfulMessage(originalCommand) {
    const helpLines = [
      '',
      '\\x1b[33m💡 Claude CLI Usage Help:\\x1b[0m',
      '',
      '  \\x1b[36mclaude --version\\x1b[0m     Show Claude CLI version',
      '  \\x1b[36mclaude --help\\x1b[0m        Show all available options',
      '  \\x1b[36mclaude chat\\x1b[0m          Start a chat session',
      '  \\x1b[36mclaude code\\x1b[0m          Code assistance mode',
      '  \\x1b[36mclaude auth login\\x1b[0m    Authenticate with Claude',
      '  \\x1b[36mclaude project init\\x1b[0m  Initialize a new project',
      '',
      '\\x1b[33m⚠️  Running \\x1b[31mclaude\\x1b[33m without arguments enters interactive mode and may appear to hang.\\x1b[0m',
      '\\x1b[32m✨ Try one of the commands above instead!\\x1b[0m',
      ''
    ];
    
    // Add context-specific suggestions based on the original command
    if (originalCommand.includes('cd')) {
      helpLines.splice(-2, 0, 
        '\\x1b[36m💡 For directory-specific operations:\\x1b[0m',
        '  \\x1b[36mclaude code --directory /path/to/dir\\x1b[0m',
        ''
      );
    }
    
    return helpLines.join('\\r\\n');
  }
  
  /**
   * Record when a hang was prevented
   */
  recordHangPrevention(command) {
    this.learnedPatterns.statistics.hangsPrevented++;
    
    if (this.options.learningEnabled) {
      // Extract pattern from command for learning
      const pattern = this.extractPattern(command);
      if (pattern && !this.learnedPatterns.hangPatterns.includes(pattern)) {
        this.learnedPatterns.hangPatterns.push(pattern);
        this.saveLearnedPatterns();
      }
    }
  }
  
  /**
   * Record when a safe command was allowed
   */
  recordSafeCommand(command) {
    this.learnedPatterns.statistics.safeCommandsPassed++;
    
    if (this.options.learningEnabled) {
      const pattern = this.extractPattern(command);
      if (pattern && !this.learnedPatterns.safePatterns.includes(pattern)) {
        this.learnedPatterns.safePatterns.push(pattern);
        this.saveLearnedPatterns();
      }
    }
  }
  
  /**
   * Extract a regex pattern from a command
   */
  extractPattern(command) {
    // Simple pattern extraction - escape special chars and generalize
    const escaped = command
      .trim()
      .replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')  // Escape regex special chars
      .replace(/\\s+/g, '\\\\s+')                    // Normalize whitespace
      .replace(/\\r?\\n?$/, '\\\\r?\\\\n?$');        // Normalize line endings
    
    return escaped;
  }
  
  /**
   * Update learning accuracy metrics
   */
  updateLearningAccuracy() {
    const total = this.learnedPatterns.statistics.totalCommands;
    const correct = this.learnedPatterns.statistics.hangsPrevented + 
                   this.learnedPatterns.statistics.safeCommandsPassed;
    
    this.learnedPatterns.statistics.learningAccuracy = total > 0 ? (correct / total) : 0;
  }
  
  /**
   * Get learned patterns
   */
  getLearnedPatterns() {
    return {
      hangPatterns: [...this.learnedPatterns.hangPatterns],
      safePatterns: [...this.learnedPatterns.safePatterns],
      statistics: { ...this.learnedPatterns.statistics }
    };
  }
  
  /**
   * Get command history
   */
  getCommandHistory() {
    return [...this.learnedPatterns.commandHistory];
  }
  
  /**
   * Load learned patterns from storage
   */
  loadLearnedPatterns() {
    try {
      // In browser environment, use localStorage
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('claude-command-patterns');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.learnedPatterns = { ...this.learnedPatterns, ...parsed };
        }
      }
      // In Node.js environment, could use file system
      // This would be implemented based on the deployment environment
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
    }
  }
  
  /**
   * Save learned patterns to storage
   */
  saveLearnedPatterns() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('claude-command-patterns', JSON.stringify(this.learnedPatterns));
      }
    } catch (error) {
      console.error('Failed to save learned patterns:', error);
    }
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.learnedPatterns.statistics,
      totalPatterns: this.learnedPatterns.hangPatterns.length + this.learnedPatterns.safePatterns.length,
      hangPatternCount: this.learnedPatterns.hangPatterns.length,
      safePatternCount: this.learnedPatterns.safePatterns.length
    };
  }
  
  /**
   * Reset learning data
   */
  resetLearning() {
    this.learnedPatterns = {
      hangPatterns: [],
      safePatterns: [],
      commandHistory: [],
      statistics: {
        totalCommands: 0,
        hangsPrevented: 0,
        safeCommandsPassed: 0,
        learningAccuracy: 0
      }
    };
    
    this.saveLearnedPatterns();
  }
  
  /**
   * Export learning data for analysis
   */
  exportLearningData() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      patterns: this.getLearnedPatterns(),
      statistics: this.getStatistics(),
      commandHistory: this.getCommandHistory().slice(-50) // Last 50 commands
    };
  }
  
  /**
   * Import learning data
   */
  importLearningData(data) {
    try {
      if (data.version === '1.0') {
        this.learnedPatterns.hangPatterns = [...data.patterns.hangPatterns];
        this.learnedPatterns.safePatterns = [...data.patterns.safePatterns];
        this.learnedPatterns.statistics = { ...data.patterns.statistics };
        
        this.saveLearnedPatterns();
        return true;
      }
    } catch (error) {
      console.error('Failed to import learning data:', error);
    }
    
    return false;
  }
}

module.exports = { ClaudeCommandDetector };