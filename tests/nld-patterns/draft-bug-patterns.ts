/**
 * Natural Language Debugging (NLD) Patterns
 * Draft Replication Bug Pattern Recognition
 * 
 * This module defines patterns to automatically detect draft replication
 * bugs and similar issues through natural language analysis of logs,
 * error messages, and user reports.
 */

export interface NLDPattern {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'replication' | 'state-management' | 'ui-logic' | 'data-consistency';
  patterns: RegExp[];
  context?: string[];
  suggestedActions: string[];
}

/**
 * Draft Replication Bug Patterns
 * These patterns help identify when draft editing creates duplicates
 */
export const draftReplicationPatterns: NLDPattern[] = [
  {
    id: 'draft-duplicate-creation',
    name: 'Draft Duplicate Creation',
    description: 'Detects when draft editing creates new drafts instead of updating existing ones',
    severity: 'critical',
    category: 'replication',
    patterns: [
      /draft.*duplicate.*created/i,
      /multiple.*drafts.*same.*content/i,
      /createDraft.*called.*edit.*mode/i,
      /expected.*1.*draft.*found.*\d+/i,
      /draft.*replication.*detected/i,
      /editing.*created.*new.*draft/i
    ],
    context: ['PostCreator', 'DraftService', 'PostCreatorModal', 'useDraftManager'],
    suggestedActions: [
      'Check if PostCreator is using updateDraft() instead of createDraft() for existing drafts',
      'Verify draft ID is preserved during editing workflow',
      'Ensure edit mode is properly detected in PostCreator component',
      'Add draft ID tracking in PostCreatorModal props'
    ]
  },

  {
    id: 'wrong-service-method',
    name: 'Wrong Draft Service Method Called',
    description: 'Detects when createDraft is called instead of updateDraft during editing',
    severity: 'critical',
    category: 'ui-logic',
    patterns: [
      /createDraft.*should.*updateDraft/i,
      /wrong.*method.*draft.*editing/i,
      /updateDraft.*not.*called.*edit/i,
      /method.*mismatch.*draft.*operation/i,
      /expected.*updateDraft.*got.*createDraft/i
    ],
    context: ['DraftService', 'PostCreator', 'saveDraft function'],
    suggestedActions: [
      'Implement conditional logic: use updateDraft() when editing existing drafts',
      'Add mode detection in PostCreator component',
      'Pass draft ID to PostCreator when editing',
      'Add explicit edit mode parameter to PostCreator props'
    ]
  },

  {
    id: 'draft-id-not-preserved',
    name: 'Draft ID Not Preserved',
    description: 'Detects when draft ID is lost during editing workflow',
    severity: 'high',
    category: 'state-management',
    patterns: [
      /draft.*id.*undefined.*edit/i,
      /missing.*draft.*id.*editing/i,
      /draft.*id.*not.*preserved/i,
      /lost.*draft.*reference.*editing/i,
      /edit.*draft.*no.*id/i,
      /undefined.*draft.*id.*save/i
    ],
    context: ['PostCreatorModal', 'PostCreator', 'React state management'],
    suggestedActions: [
      'Ensure draft ID is passed from DraftManager to PostCreatorModal',
      'Add draft ID to PostCreator props when editing',
      'Store draft ID in component state during editing session',
      'Add validation to ensure draft ID exists before update operations'
    ]
  },

  {
    id: 'modal-state-corruption',
    name: 'Modal State Corruption',
    description: 'Detects when modal state is corrupted causing edit mode issues',
    severity: 'medium',
    category: 'state-management',
    patterns: [
      /modal.*state.*corrupted.*draft/i,
      /edit.*mode.*not.*detected/i,
      /modal.*wrong.*mode.*draft/i,
      /state.*inconsistent.*modal.*draft/i,
      /modal.*props.*missing.*edit/i
    ],
    context: ['PostCreatorModal', 'React state', 'useEffect hooks'],
    suggestedActions: [
      'Add proper modal state reset when switching between create/edit modes',
      'Implement key-based re-rendering for modal content',
      'Add state validation in PostCreatorModal',
      'Use useEffect dependency array to handle draft changes'
    ]
  },

  {
    id: 'auto-save-replication',
    name: 'Auto-save Replication',
    description: 'Detects when auto-save creates duplicates instead of updating',
    severity: 'high',
    category: 'replication',
    patterns: [
      /auto.*save.*created.*duplicate/i,
      /multiple.*drafts.*auto.*save/i,
      /auto.*save.*wrong.*method/i,
      /auto.*save.*createDraft.*edit/i,
      /timer.*created.*new.*draft/i
    ],
    context: ['auto-save functionality', 'useEffect timers', 'PostCreator'],
    suggestedActions: [
      'Ensure auto-save uses updateDraft when editing existing drafts',
      'Add draft ID check in auto-save logic',
      'Implement proper edit mode detection in auto-save',
      'Add debouncing to prevent rapid auto-save calls'
    ]
  },

  {
    id: 'concurrent-editing-race',
    name: 'Concurrent Editing Race Condition',
    description: 'Detects race conditions when multiple sessions edit the same draft',
    severity: 'medium',
    category: 'data-consistency',
    patterns: [
      /concurrent.*edit.*race.*condition/i,
      /multiple.*tabs.*editing.*draft/i,
      /race.*condition.*draft.*save/i,
      /concurrent.*updates.*draft/i,
      /editing.*conflict.*draft/i
    ],
    context: ['localStorage', 'concurrent access', 'DraftService'],
    suggestedActions: [
      'Implement optimistic locking for draft updates',
      'Add timestamp-based conflict resolution',
      'Show warning when draft is being edited in another session',
      'Add draft locking mechanism for concurrent access'
    ]
  }
];

/**
 * User-reported Pattern Keywords
 * Common phrases users might use when reporting draft bugs
 */
export const userReportPatterns: NLDPattern[] = [
  {
    id: 'user-duplicate-complaint',
    name: 'User Reports Duplicate Drafts',
    description: 'Detects user reports about duplicate drafts appearing',
    severity: 'high',
    category: 'replication',
    patterns: [
      /seeing.*duplicate.*drafts/i,
      /drafts.*appearing.*twice/i,
      /same.*draft.*multiple.*times/i,
      /editing.*creates.*copy/i,
      /why.*two.*drafts.*same/i,
      /draft.*copied.*editing/i
    ],
    context: ['user feedback', 'bug reports', 'support tickets'],
    suggestedActions: [
      'Investigate draft editing workflow for replication bugs',
      'Check PostCreator save logic for create vs update issue',
      'Verify draft ID handling in editing process'
    ]
  },

  {
    id: 'user-lost-changes',
    name: 'User Reports Lost Changes',
    description: 'Detects when users report their draft changes are not saved',
    severity: 'high',
    category: 'data-consistency',
    patterns: [
      /changes.*not.*saved.*draft/i,
      /lost.*my.*draft.*edits/i,
      /draft.*reverted.*original/i,
      /editing.*disappeared.*draft/i,
      /save.*button.*not.*working/i
    ],
    context: ['user feedback', 'data persistence'],
    suggestedActions: [
      'Check if updateDraft is properly updating the correct draft',
      'Verify draft ID is maintained during editing',
      'Add better save confirmation feedback'
    ]
  }
];

/**
 * Code Pattern Detection
 * Patterns that detect problematic code structures
 */
export const codePatterns: NLDPattern[] = [
  {
    id: 'always-create-draft-antipattern',
    name: 'Always CreateDraft Anti-pattern',
    description: 'Detects code that always calls createDraft regardless of mode',
    severity: 'critical',
    category: 'ui-logic',
    patterns: [
      /const.*saveDraft.*=.*createDraft/i,
      /await.*createDraft.*\(.*\).*\/\/.*edit/i,
      /saveDraft.*always.*createDraft/i,
    ],
    context: ['PostCreator.tsx', 'saveDraft function'],
    suggestedActions: [
      'Add conditional logic to use updateDraft when editing',
      'Pass edit mode and draft ID to determine correct method',
      'Implement proper draft editing state management'
    ]
  },

  {
    id: 'missing-draft-id-prop',
    name: 'Missing Draft ID Prop',
    description: 'Detects when components are missing draft ID props for editing',
    severity: 'high',
    category: 'state-management',
    patterns: [
      /<PostCreator.*(?!editDraftId|draftId)/i,
      /PostCreator.*props.*without.*id/i,
    ],
    context: ['PostCreatorModal.tsx', 'component props'],
    suggestedActions: [
      'Add editDraftId prop to PostCreator interface',
      'Pass draft ID from modal to PostCreator component',
      'Update PostCreator to handle draft ID for editing'
    ]
  }
];

/**
 * Log Pattern Analyzer
 * Analyzes console logs and error messages for draft bug patterns
 */
export class DraftBugPatternAnalyzer {
  private allPatterns: NLDPattern[];

  constructor() {
    this.allPatterns = [...draftReplicationPatterns, ...userReportPatterns, ...codePatterns];
  }

  /**
   * Analyze a log message or error for draft bug patterns
   */
  analyzeMessage(message: string, context?: string): {
    matches: NLDPattern[];
    severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
    recommendations: string[];
  } {
    const matches: NLDPattern[] = [];

    for (const pattern of this.allPatterns) {
      const isMatch = pattern.patterns.some(regex => regex.test(message));
      const contextMatch = !pattern.context || 
                          !context || 
                          pattern.context.some(ctx => context.includes(ctx));

      if (isMatch && contextMatch) {
        matches.push(pattern);
      }
    }

    const severity = this.determineSeverity(matches);
    const recommendations = this.generateRecommendations(matches);

    return { matches, severity, recommendations };
  }

  /**
   * Analyze multiple messages in batch
   */
  analyzeBatch(messages: { message: string; context?: string; timestamp?: Date }[]): {
    totalIssues: number;
    criticalIssues: number;
    patternSummary: Map<string, number>;
    recommendations: string[];
  } {
    const patternCounts = new Map<string, number>();
    let criticalIssues = 0;
    const allRecommendations = new Set<string>();

    for (const { message, context } of messages) {
      const analysis = this.analyzeMessage(message, context);
      
      if (analysis.severity === 'critical') {
        criticalIssues++;
      }

      for (const match of analysis.matches) {
        patternCounts.set(match.id, (patternCounts.get(match.id) || 0) + 1);
      }

      analysis.recommendations.forEach(rec => allRecommendations.add(rec));
    }

    return {
      totalIssues: patternCounts.size,
      criticalIssues,
      patternSummary: patternCounts,
      recommendations: Array.from(allRecommendations)
    };
  }

  private determineSeverity(matches: NLDPattern[]): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    if (matches.length === 0) return 'none';
    
    const severities = matches.map(m => m.severity);
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private generateRecommendations(matches: NLDPattern[]): string[] {
    const recommendations = new Set<string>();
    
    matches.forEach(match => {
      match.suggestedActions.forEach(action => recommendations.add(action));
    });

    return Array.from(recommendations);
  }

  /**
   * Get all patterns by category
   */
  getPatternsByCategory(category: NLDPattern['category']): NLDPattern[] {
    return this.allPatterns.filter(p => p.category === category);
  }

  /**
   * Get all patterns by severity
   */
  getPatternsBySeverity(severity: NLDPattern['severity']): NLDPattern[] {
    return this.allPatterns.filter(p => p.severity === severity);
  }
}

/**
 * Draft Bug Detection Utilities
 */
export const draftBugDetection = {
  analyzer: new DraftBugPatternAnalyzer(),
  
  /**
   * Quick check for critical draft replication patterns
   */
  hasCriticalDraftBug(message: string): boolean {
    const analysis = this.analyzer.analyzeMessage(message);
    return analysis.severity === 'critical' && 
           analysis.matches.some(m => m.category === 'replication');
  },

  /**
   * Generate bug report from pattern analysis
   */
  generateBugReport(messages: string[]): {
    hasCriticalBugs: boolean;
    summary: string;
    detailedFindings: any;
    actionItems: string[];
  } {
    const analysisData = messages.map(msg => ({ message: msg }));
    const analysis = this.analyzer.analyzeBatch(analysisData);
    
    const hasCriticalBugs = analysis.criticalIssues > 0;
    const summary = `Found ${analysis.totalIssues} potential issues, ${analysis.criticalIssues} critical`;
    
    return {
      hasCriticalBugs,
      summary,
      detailedFindings: {
        totalIssues: analysis.totalIssues,
        criticalIssues: analysis.criticalIssues,
        patterns: Object.fromEntries(analysis.patternSummary)
      },
      actionItems: analysis.recommendations
    };
  }
};

export default draftBugDetection;