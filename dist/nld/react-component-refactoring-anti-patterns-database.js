"use strict";
/**
 * React Component Refactoring Anti-Patterns Database
 * Captures and analyzes common anti-patterns during SSE to WebSocket refactoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactRefactoringAntiPatternsDatabase = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class ReactRefactoringAntiPatternsDatabase {
    patterns = [];
    dataDir;
    patternsFile;
    constructor() {
        this.dataDir = (0, path_1.join)(process.cwd(), 'src/nld/patterns');
        this.patternsFile = (0, path_1.join)(this.dataDir, 'react-refactoring-anti-patterns.json');
        this.ensureDataDirectory();
        this.initializeDatabase();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    initializeDatabase() {
        if ((0, fs_1.existsSync)(this.patternsFile)) {
            try {
                const data = (0, fs_1.readFileSync)(this.patternsFile, 'utf8');
                this.patterns = JSON.parse(data);
                console.log(`✅ Loaded ${this.patterns.length} React refactoring anti-patterns`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing patterns, initializing fresh database');
                this.initializeDefaultPatterns();
            }
        }
        else {
            this.initializeDefaultPatterns();
        }
    }
    initializeDefaultPatterns() {
        const defaultPatterns = [
            {
                id: 'RP001',
                name: 'Undefined Handler Reference After Migration',
                description: 'Component still references SSE handler methods that no longer exist after WebSocket migration',
                component: 'ClaudeInstanceManager',
                antiPatternCode: `// After migrating to WebSocket, but keeping old SSE handler references
componentDidMount() {
  const websocket = new WebSocket('ws://localhost:3001');
  // ERROR: addHandler doesn't exist on WebSocket
  websocket.addHandler('message', this.handleMessage);
  websocket.addHandler('error', this.handleError);
}

componentWillUnmount() {
  // ERROR: removeHandler doesn't exist
  this.websocket.removeHandler('message', this.handleMessage);
}`,
                correctCode: `// Correct WebSocket implementation
componentDidMount() {
  this.websocket = new WebSocket('ws://localhost:3001');
  this.websocket.addEventListener('message', this.handleMessage);
  this.websocket.addEventListener('error', this.handleError);
}

componentWillUnmount() {
  if (this.websocket) {
    this.websocket.removeEventListener('message', this.handleMessage);
    this.websocket.removeEventListener('error', this.handleError);
    this.websocket.close();
  }
}`,
                symptoms: [
                    'ReferenceError: addHandler is not defined',
                    'TypeError: websocket.addHandler is not a function',
                    'Component fails to establish connection',
                    'Event handlers not properly cleaned up'
                ],
                causes: [
                    'Incomplete migration from SSE to WebSocket',
                    'Copy-paste refactoring without updating method names',
                    'Mixing SSE and WebSocket patterns in same component',
                    'Lack of testing during refactoring process'
                ],
                consequences: [
                    'Runtime errors breaking user interface',
                    'Memory leaks from uncleaned event handlers',
                    'Connection failures',
                    'Inconsistent application behavior'
                ],
                detectionRules: [
                    'Check for .addHandler() calls on WebSocket objects',
                    'Look for .removeHandler() calls in cleanup methods',
                    'Validate event listener management patterns',
                    'Ensure proper WebSocket lifecycle management'
                ],
                prevention: [
                    'Use TypeScript for compile-time error detection',
                    'Create migration checklists for handler refactoring',
                    'Implement automated tests for connection patterns',
                    'Use linting rules to detect deprecated handler methods'
                ],
                severity: 'high',
                frequency: 0,
                category: 'handlers',
                refactoringContext: {
                    from: 'SSE',
                    to: 'WebSocket',
                    migration: 'SSE_TO_WEBSOCKET',
                    phase: 'handler_replacement'
                },
                realWorldExample: {
                    project: 'agent-feed',
                    file: 'ClaudeInstanceManager.tsx',
                    lineRange: '45-52',
                    impact: 'Component fails to connect, breaks instance management'
                },
                metadata: {
                    firstDetected: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    affectedComponents: ['ClaudeInstanceManager', 'ClaudeInstanceSelector'],
                    relatedPatterns: ['RP002', 'RP004']
                }
            },
            {
                id: 'RP002',
                name: 'Incomplete useEffect Cleanup During Migration',
                description: 'useEffect cleanup functions still reference old SSE methods after WebSocket migration',
                component: 'useHTTPSSE',
                antiPatternCode: `// Hook migrated to WebSocket but cleanup still uses SSE pattern
const useHTTPSSE = (url: string) => {
  const [connection, setConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    setConnection(ws);

    return () => {
      // ERROR: WebSocket doesn't have removeHandler method
      ws.removeHandler('message', handleMessage);
      ws.removeHandler('error', handleError);
    };
  }, [url]);
};`,
                correctCode: `// Correct WebSocket cleanup in useEffect
const useHTTPSSE = (url: string) => {
  const [connection, setConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    const handleMessage = (event: MessageEvent) => {
      // Handle message
    };
    
    const handleError = (event: Event) => {
      // Handle error
    };

    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    setConnection(ws);

    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('error', handleError);
      ws.close();
    };
  }, [url]);
};`,
                symptoms: [
                    'ReferenceError in useEffect cleanup',
                    'Memory leaks from uncleaned listeners',
                    'Hook fails to cleanup properly',
                    'Console warnings about missing cleanup'
                ],
                causes: [
                    'Partial migration of hook patterns',
                    'Copy-paste errors during refactoring',
                    'Not updating cleanup functions to match new API',
                    'Mixing EventSource and WebSocket patterns'
                ],
                consequences: [
                    'Memory leaks in React applications',
                    'Stale closures causing unexpected behavior',
                    'Performance degradation over time',
                    'Inconsistent connection management'
                ],
                detectionRules: [
                    'Scan useEffect cleanup functions for deprecated methods',
                    'Check for proper WebSocket cleanup patterns',
                    'Validate event listener removal',
                    'Ensure connection closure in cleanup'
                ],
                prevention: [
                    'Create hook testing utilities',
                    'Use React Testing Library for cleanup validation',
                    'Implement custom hooks for connection management',
                    'Add ESLint rules for proper cleanup patterns'
                ],
                severity: 'medium',
                frequency: 0,
                category: 'effects',
                refactoringContext: {
                    from: 'SSE',
                    to: 'WebSocket',
                    migration: 'HOOK_PATTERN_MIGRATION',
                    phase: 'cleanup_refactoring'
                },
                realWorldExample: {
                    project: 'agent-feed',
                    file: 'useHTTPSSE.ts',
                    lineRange: '78-95',
                    impact: 'Memory leaks and connection issues in SSE hook'
                },
                metadata: {
                    firstDetected: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    affectedComponents: ['useHTTPSSE', 'useAdvancedSSEConnection'],
                    relatedPatterns: ['RP001', 'RP003']
                }
            },
            {
                id: 'RP003',
                name: 'Protocol Mismatch in Connection URLs',
                description: 'WebSocket connection attempts using HTTP/SSE endpoint URLs without protocol conversion',
                component: 'useAdvancedSSEConnection',
                antiPatternCode: `// WebSocket trying to connect to HTTP SSE endpoint
const useAdvancedSSEConnection = () => {
  useEffect(() => {
    // ERROR: WebSocket cannot connect to HTTP endpoint
    const ws = new WebSocket('http://localhost:3001/sse');
    
    ws.addEventListener('open', () => {
      console.log('Connected'); // This will never fire
    });
  }, []);
};`,
                correctCode: `// Correct protocol handling for WebSocket
const useAdvancedSSEConnection = () => {
  useEffect(() => {
    // Convert HTTP to WebSocket protocol
    const wsUrl = 'ws://localhost:3001/websocket'; // Use proper WebSocket endpoint
    const ws = new WebSocket(wsUrl);
    
    ws.addEventListener('open', () => {
      console.log('WebSocket connected');
    });
    
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }, []);
};`,
                symptoms: [
                    'WebSocket connection failures',
                    'Network errors in browser console',
                    'Connection never establishes',
                    'Protocol mismatch errors'
                ],
                causes: [
                    'Reusing SSE endpoint URLs for WebSocket',
                    'Not updating backend to support WebSocket protocol',
                    'Incomplete understanding of protocol differences',
                    'Copy-paste migration without URL updates'
                ],
                consequences: [
                    'Complete connection failure',
                    'Application functionality breakdown',
                    'Poor user experience',
                    'Debugging challenges'
                ],
                detectionRules: [
                    'Check WebSocket URLs for http:// protocol',
                    'Validate endpoint protocol compatibility',
                    'Ensure backend supports WebSocket protocol',
                    'Test connection establishment'
                ],
                prevention: [
                    'Create URL validation utilities',
                    'Implement protocol detection logic',
                    'Add connection health monitoring',
                    'Use environment-specific configuration'
                ],
                severity: 'critical',
                frequency: 0,
                category: 'handlers',
                refactoringContext: {
                    from: 'SSE',
                    to: 'WebSocket',
                    migration: 'PROTOCOL_CONVERSION',
                    phase: 'connection_setup'
                },
                realWorldExample: {
                    project: 'agent-feed',
                    file: 'useAdvancedSSEConnection.ts',
                    lineRange: '34-45',
                    impact: 'Complete connection failure, app non-functional'
                },
                metadata: {
                    firstDetected: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    affectedComponents: ['useAdvancedSSEConnection', 'SSEConnectionManager'],
                    relatedPatterns: ['RP004', 'RP005']
                }
            },
            {
                id: 'RP004',
                name: 'State Management Inconsistency During Migration',
                description: 'React state still reflects SSE patterns after WebSocket migration, causing state inconsistencies',
                component: 'TokenCostAnalytics',
                antiPatternCode: `// State management not updated for WebSocket patterns
const [sseConnected, setSseConnected] = useState(false);
const [eventSource, setEventSource] = useState<EventSource | null>(null);

useEffect(() => {
  // Migrated to WebSocket but state variables still reference SSE
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.addEventListener('open', () => {
    setSseConnected(true); // Confusing: WebSocket but SSE state name
    setEventSource(ws as any); // Type mismatch: WebSocket assigned to EventSource
  });
}, []);`,
                correctCode: `// Consistent state management for WebSocket
const [wsConnected, setWsConnected] = useState(false);
const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.addEventListener('open', () => {
    setWsConnected(true);
    setWebSocket(ws);
  });
  
  ws.addEventListener('close', () => {
    setWsConnected(false);
    setWebSocket(null);
  });
}, []);`,
                symptoms: [
                    'Confusing variable names in codebase',
                    'Type errors with state assignments',
                    'Misleading debugging information',
                    'State inconsistencies'
                ],
                causes: [
                    'Incomplete refactoring of state variables',
                    'Not updating variable names during migration',
                    'Type system not catching state mismatches',
                    'Rushed refactoring without proper review'
                ],
                consequences: [
                    'Confusing codebase for developers',
                    'Type safety violations',
                    'Debugging difficulties',
                    'Maintenance challenges'
                ],
                detectionRules: [
                    'Check for SSE-named variables with WebSocket types',
                    'Validate state variable naming consistency',
                    'Ensure type safety in state management',
                    'Review variable usage patterns'
                ],
                prevention: [
                    'Use consistent naming conventions',
                    'Implement comprehensive refactoring checklists',
                    'Leverage TypeScript strict mode',
                    'Add code review for naming consistency'
                ],
                severity: 'medium',
                frequency: 0,
                category: 'state',
                refactoringContext: {
                    from: 'SSE',
                    to: 'WebSocket',
                    migration: 'STATE_MANAGEMENT_MIGRATION',
                    phase: 'variable_renaming'
                },
                realWorldExample: {
                    project: 'agent-feed',
                    file: 'TokenCostAnalytics.tsx',
                    lineRange: '67-89',
                    impact: 'Confusing state management, type safety issues'
                },
                metadata: {
                    firstDetected: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    affectedComponents: ['TokenCostAnalytics', 'ClaudeInstanceManagerModern'],
                    relatedPatterns: ['RP001', 'RP003']
                }
            },
            {
                id: 'RP005',
                name: 'Mixed Event Handler Patterns',
                description: 'Component uses both SSE and WebSocket event handling patterns simultaneously, creating conflicts',
                component: 'ClaudeInstanceManagerModern',
                antiPatternCode: `// Mixing SSE and WebSocket event patterns
class ClaudeInstanceManagerModern extends Component {
  componentDidMount() {
    // Old SSE pattern
    this.eventSource = new EventSource('/sse');
    this.eventSource.onmessage = this.handleSSEMessage;
    
    // New WebSocket pattern added without removing SSE
    this.websocket = new WebSocket('ws://localhost:3001');
    this.websocket.addEventListener('message', this.handleWSMessage);
  }
  
  handleSSEMessage = (event) => {
    // Handles SSE messages
  }
  
  handleWSMessage = (event) => {
    // Handles WebSocket messages  
    // Potential conflicts with SSE handler
  }
}`,
                correctCode: `// Clean WebSocket-only implementation
class ClaudeInstanceManagerModern extends Component {
  componentDidMount() {
    // Single WebSocket connection
    this.websocket = new WebSocket('ws://localhost:3001');
    this.websocket.addEventListener('message', this.handleMessage);
    this.websocket.addEventListener('error', this.handleError);
    this.websocket.addEventListener('close', this.handleClose);
  }
  
  componentWillUnmount() {
    if (this.websocket) {
      this.websocket.removeEventListener('message', this.handleMessage);
      this.websocket.removeEventListener('error', this.handleError);
      this.websocket.removeEventListener('close', this.handleClose);
      this.websocket.close();
    }
  }
  
  handleMessage = (event: MessageEvent) => {
    // Single, consistent message handler
  }
}`,
                symptoms: [
                    'Duplicate connections being established',
                    'Conflicting message handlers',
                    'Resource waste from multiple connections',
                    'Inconsistent behavior'
                ],
                causes: [
                    'Gradual migration without removing old code',
                    'Fear of breaking existing functionality',
                    'Incomplete understanding of migration scope',
                    'Lack of proper testing during migration'
                ],
                consequences: [
                    'Resource waste from multiple connections',
                    'Unpredictable application behavior',
                    'Performance degradation',
                    'Increased complexity and maintenance burden'
                ],
                detectionRules: [
                    'Check for both EventSource and WebSocket in same component',
                    'Look for duplicate message handlers',
                    'Identify multiple connection patterns',
                    'Validate single responsibility principle'
                ],
                prevention: [
                    'Use feature flags for gradual migration',
                    'Implement comprehensive testing',
                    'Create clear migration milestones',
                    'Remove old code after successful migration'
                ],
                severity: 'high',
                frequency: 0,
                category: 'handlers',
                refactoringContext: {
                    from: 'SSE',
                    to: 'WebSocket',
                    migration: 'PARALLEL_PATTERN_CONFLICT',
                    phase: 'transition_overlap'
                },
                realWorldExample: {
                    project: 'agent-feed',
                    file: 'ClaudeInstanceManagerModern.tsx',
                    lineRange: '45-78',
                    impact: 'Duplicate connections, resource waste, inconsistent behavior'
                },
                metadata: {
                    firstDetected: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    affectedComponents: ['ClaudeInstanceManagerModern'],
                    relatedPatterns: ['RP001', 'RP002']
                }
            }
        ];
        this.patterns = defaultPatterns;
        this.persistPatterns();
        console.log(`✅ Initialized ${this.patterns.length} default React refactoring anti-patterns`);
    }
    addPattern(pattern) {
        const newPattern = {
            ...pattern,
            id: `RP${String(this.patterns.length + 1).padStart(3, '0')}`,
            metadata: {
                firstDetected: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                affectedComponents: [pattern.component],
                relatedPatterns: []
            }
        };
        this.patterns.push(newPattern);
        this.persistPatterns();
        console.log(`✅ Added new anti-pattern: ${newPattern.name}`);
    }
    updatePatternFrequency(patternId) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
            pattern.frequency += 1;
            pattern.metadata.lastSeen = new Date().toISOString();
            this.persistPatterns();
        }
    }
    getPatternsByCategory(category) {
        return this.patterns.filter(p => p.category === category);
    }
    getPatternsBySeverity(severity) {
        return this.patterns.filter(p => p.severity === severity);
    }
    getPatternsByComponent(component) {
        return this.patterns.filter(p => p.component === component || p.metadata.affectedComponents.includes(component));
    }
    getFrequentPatterns(minFrequency = 1) {
        return this.patterns
            .filter(p => p.frequency >= minFrequency)
            .sort((a, b) => b.frequency - a.frequency);
    }
    searchPatterns(query) {
        const lowerQuery = query.toLowerCase();
        return this.patterns.filter(p => p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery) ||
            p.symptoms.some(s => s.toLowerCase().includes(lowerQuery)) ||
            p.causes.some(c => c.toLowerCase().includes(lowerQuery)));
    }
    exportToNeuralTraining() {
        const trainingData = {
            dataset: 'react-refactoring-anti-patterns',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            totalPatterns: this.patterns.length,
            categories: this.getPatternSummary().byCategory,
            severityDistribution: this.getPatternSummary().bySeverity,
            trainingExamples: this.patterns.map(pattern => ({
                input: {
                    antiPatternCode: pattern.antiPatternCode,
                    component: pattern.component,
                    symptoms: pattern.symptoms,
                    refactoringContext: pattern.refactoringContext
                },
                output: {
                    patternName: pattern.name,
                    severity: pattern.severity,
                    category: pattern.category,
                    correctCode: pattern.correctCode,
                    prevention: pattern.prevention,
                    detectionRules: pattern.detectionRules
                },
                metadata: {
                    patternId: pattern.id,
                    frequency: pattern.frequency,
                    realWorldExample: pattern.realWorldExample,
                    relatedPatterns: pattern.metadata.relatedPatterns
                }
            }))
        };
        const exportPath = (0, path_1.join)(this.dataDir, 'neural-training-react-anti-patterns.json');
        (0, fs_1.writeFileSync)(exportPath, JSON.stringify(trainingData, null, 2));
        console.log(`🧠 React anti-patterns neural training data exported: ${exportPath}`);
        return exportPath;
    }
    generateAntiPatternsReport() {
        const report = {
            summary: this.getPatternSummary(),
            criticalPatterns: this.getPatternsBySeverity('critical'),
            highFrequencyPatterns: this.getFrequentPatterns(2),
            migrationRisks: this.analyzeMigrationRisks(),
            recommendations: this.generateRecommendations(),
            detectionRules: this.compileDetectionRules(),
            timestamp: new Date().toISOString()
        };
        const reportPath = (0, path_1.join)(this.dataDir, `react-anti-patterns-report-${Date.now()}.json`);
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 React anti-patterns report generated: ${reportPath}`);
        return reportPath;
    }
    getPatternSummary() {
        return {
            total: this.patterns.length,
            byCategory: this.groupBy('category'),
            bySeverity: this.groupBy('severity'),
            byRefactoringType: this.groupBy(p => p.refactoringContext.migration),
            mostCommon: this.patterns.reduce((max, p) => p.frequency > max.frequency ? p : max, this.patterns[0])
        };
    }
    groupBy(keySelector) {
        return this.patterns.reduce((acc, pattern) => {
            const key = typeof keySelector === 'function' ?
                String(keySelector(pattern)) :
                String(pattern[keySelector]);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    analyzeMigrationRisks() {
        return {
            highRiskComponents: this.patterns
                .filter(p => p.severity === 'critical' || p.severity === 'high')
                .map(p => p.component),
            commonFailurePoints: this.patterns
                .flatMap(p => p.refactoringContext.phase)
                .reduce((acc, phase) => {
                acc[phase] = (acc[phase] || 0) + 1;
                return acc;
            }, {}),
            riskMitigation: this.patterns
                .flatMap(p => p.prevention)
                .filter((prevention, index, array) => array.indexOf(prevention) === index)
        };
    }
    generateRecommendations() {
        return [
            'Implement comprehensive testing before and after refactoring',
            'Use TypeScript strict mode to catch type mismatches early',
            'Create refactoring checklists for systematic migrations',
            'Deploy automated linting rules for anti-pattern detection',
            'Implement gradual migration strategies with feature flags',
            'Add comprehensive error boundaries for graceful failure handling',
            'Create integration tests for connection lifecycle management',
            'Use code review processes to catch migration issues',
            'Implement monitoring for runtime errors during migrations',
            'Create documentation for migration best practices'
        ];
    }
    compileDetectionRules() {
        return this.patterns
            .flatMap(p => p.detectionRules)
            .filter((rule, index, array) => array.indexOf(rule) === index);
    }
    persistPatterns() {
        try {
            (0, fs_1.writeFileSync)(this.patternsFile, JSON.stringify(this.patterns, null, 2));
        }
        catch (error) {
            console.error('❌ Failed to persist React anti-patterns:', error);
        }
    }
    getAllPatterns() {
        return [...this.patterns];
    }
}
exports.ReactRefactoringAntiPatternsDatabase = ReactRefactoringAntiPatternsDatabase;
//# sourceMappingURL=react-component-refactoring-anti-patterns-database.js.map