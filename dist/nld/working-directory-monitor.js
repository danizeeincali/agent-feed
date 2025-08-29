"use strict";
/**
 * Real-time Working Directory Configuration Monitor
 * Monitors simple-backend.js for hardcoded working directory patterns
 * and provides live detection of directory spawning failures
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingDirectoryMonitor = void 0;
const fs = __importStar(require("fs"));
const working_directory_pattern_detector_1 = require("./working-directory-pattern-detector");
const working_directory_anti_patterns_database_1 = require("./working-directory-anti-patterns-database");
class WorkingDirectoryMonitor {
    patternDetector;
    antiPatternsDB;
    isMonitoring = false;
    monitoringInterval;
    lastKnownContent = '';
    BACKEND_FILE = '/workspaces/agent-feed/simple-backend.js';
    MONITOR_INTERVAL = 5000; // 5 seconds
    constructor() {
        this.patternDetector = new working_directory_pattern_detector_1.WorkingDirectoryPatternDetector();
        this.antiPatternsDB = new working_directory_anti_patterns_database_1.WorkingDirectoryAntiPatternsDatabase();
    }
    /**
     * Start real-time monitoring of createRealClaudeInstance function
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('📊 NLD Working Directory Monitor already running');
            return;
        }
        console.log('🔍 Starting NLD Working Directory Monitor...');
        console.log(`📁 Monitoring: ${this.BACKEND_FILE}`);
        console.log('🎯 Target: createRealClaudeInstance function, line 30: workingDir assignment');
        this.isMonitoring = true;
        this.lastKnownContent = await this.readBackendFile();
        // Initial scan
        await this.scanForPatterns();
        // Start periodic monitoring
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.scanForPatterns();
            }
            catch (error) {
                console.error('❌ Error in monitoring cycle:', error);
            }
        }, this.MONITOR_INTERVAL);
        console.log('✅ NLD Working Directory Monitor started');
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isMonitoring = false;
        console.log('🛑 NLD Working Directory Monitor stopped');
    }
    /**
     * Scan backend file for working directory anti-patterns
     */
    async scanForPatterns() {
        try {
            const currentContent = await this.readBackendFile();
            // Check if file changed
            if (currentContent !== this.lastKnownContent) {
                console.log('🔄 Backend file changed, re-scanning for patterns...');
                this.lastKnownContent = currentContent;
            }
            // Scan for hardcoded working directory pattern
            const hardcodedPattern = await this.detectHardcodedWorkingDir(currentContent);
            if (hardcodedPattern) {
                await this.antiPatternsDB.recordDetection('WD_HARDCODED_PARENT_DIR', hardcodedPattern);
                console.log('⚠️  Detected: Hardcoded working directory pattern');
            }
            // Scan for missing button mapping
            const missingMapping = await this.detectMissingButtonMapping(currentContent);
            if (missingMapping) {
                await this.antiPatternsDB.recordDetection('WD_MISSING_BUTTON_MAPPING', missingMapping);
                console.log('⚠️  Detected: Missing button type to directory mapping');
            }
            // Scan for missing validation
            const missingValidation = await this.detectMissingDirectoryValidation(currentContent);
            if (missingValidation) {
                await this.antiPatternsDB.recordDetection('WD_NO_VALIDATION', missingValidation);
                console.log('⚠️  Detected: Missing working directory validation');
            }
        }
        catch (error) {
            console.error('❌ Error scanning for patterns:', error);
        }
    }
    /**
     * Detect hardcoded working directory pattern
     */
    async detectHardcodedWorkingDir(content) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            // Look for the specific hardcoded pattern
            if (line.includes('const workingDir = \'/workspaces/agent-feed\';')) {
                return {
                    line: lineNumber,
                    code: line.trim(),
                    context: 'createRealClaudeInstance function',
                    issue: 'Hardcoded to parent directory instead of button-specific subdirectory'
                };
            }
        }
        return null;
    }
    /**
     * Detect missing button type to directory mapping
     */
    async detectMissingButtonMapping(content) {
        const hasInstanceTypeParam = content.includes('createRealClaudeInstance(instanceType');
        const hasDirectoryMapping = content.includes('BUTTON_DIRECTORY_MAP') ||
            content.includes('getWorkingDirectoryByType') ||
            content.includes('instanceType') && content.includes('workingDir');
        if (hasInstanceTypeParam && !hasDirectoryMapping) {
            return {
                issue: 'instanceType parameter exists but not used for directory selection',
                context: 'createRealClaudeInstance function signature vs implementation',
                impact: 'All button types result in same working directory'
            };
        }
        return null;
    }
    /**
     * Detect missing working directory validation
     */
    async detectMissingDirectoryValidation(content) {
        const hasSpawnCall = content.includes('spawn(command, args, {');
        const hasDirectoryValidation = content.includes('fs.existsSync') ||
            content.includes('fs.accessSync') ||
            content.includes('mkdirSync');
        if (hasSpawnCall && !hasDirectoryValidation) {
            return {
                issue: 'Process spawn without working directory validation',
                context: 'spawn() call in createRealClaudeInstance',
                impact: 'Silent failures when working directory does not exist or is inaccessible'
            };
        }
        return null;
    }
    /**
     * Read backend file content
     */
    async readBackendFile() {
        try {
            return await fs.promises.readFile(this.BACKEND_FILE, 'utf-8');
        }
        catch (error) {
            console.error(`❌ Error reading backend file: ${this.BACKEND_FILE}`, error);
            return '';
        }
    }
    /**
     * Process user feedback about directory spawning issues
     */
    async processUserFeedback(feedback) {
        console.log('🎯 NLD Processing user feedback about directory spawning...');
        const detected = this.patternDetector.detectTriggerConditions(feedback.message);
        if (!detected) {
            return {
                detected: false,
                patterns: [],
                recommendations: []
            };
        }
        // Capture the failure pattern
        const recordId = await this.patternDetector.captureFailurePattern(feedback.message, {
            originalTask: `User clicked ${feedback.buttonType} button expecting ${feedback.expectedDirectory}`,
            claudeSolution: 'Hardcoded working directory configuration',
            confidenceLevel: 85 // Claude was confident but wrong
        });
        const detectedPatterns = ['HARDCODED_WORKING_DIR', 'MISSING_BUTTON_MAPPING'];
        const recommendations = [
            'Implement dynamic working directory mapping based on button type',
            'Create BUTTON_DIRECTORY_MAP configuration object',
            'Add working directory validation and auto-creation',
            'Write TDD tests for directory mapping functionality'
        ];
        return {
            detected: true,
            recordId,
            patterns: detectedPatterns,
            recommendations
        };
    }
    /**
     * Get monitoring status and statistics
     */
    getMonitoringStatus() {
        const patterns = this.antiPatternsDB.getAllPatterns();
        const detectedPatterns = patterns.filter(p => p.frequency > 0);
        return {
            isRunning: this.isMonitoring,
            monitoredFile: this.BACKEND_FILE,
            lastScan: new Date().toISOString(),
            detectedPatterns: detectedPatterns.map(p => ({
                name: p.name,
                frequency: p.frequency,
                severity: p.severity,
                lastDetected: p.lastDetected
            })),
            recommendations: [
                'Replace hardcoded workingDir with dynamic mapping',
                'Implement button type to directory configuration',
                'Add directory validation before process spawning',
                'Create comprehensive TDD test suite for directory logic'
            ]
        };
    }
    /**
     * Export comprehensive NLD report
     */
    async exportNLDReport() {
        const patterns = this.patternDetector.getAllPatterns();
        const antiPatterns = await this.antiPatternsDB.exportForAnalysis();
        const neuralData = await this.patternDetector.exportNeuralTrainingData();
        const report = {
            timestamp: new Date().toISOString(),
            monitoringTarget: this.BACKEND_FILE,
            detectedFailures: patterns,
            antiPatternsDatabase: antiPatterns,
            neuralTrainingExport: neuralData,
            summary: {
                totalFailurePatterns: patterns.length,
                totalAntiPatterns: antiPatterns.patterns.length,
                criticalIssues: antiPatterns.patterns.filter(p => p.severity === 'critical').length,
                highSeverityIssues: antiPatterns.patterns.filter(p => p.severity === 'high').length,
                tddImprovementOpportunities: patterns.filter(p => !p.tddFactor).length,
                recommendations: {
                    immediate: [
                        'Fix hardcoded workingDir in simple-backend.js line 30',
                        'Implement dynamic directory mapping for button types'
                    ],
                    strategic: [
                        'Establish TDD practices for directory configuration',
                        'Create comprehensive test coverage for working directory logic',
                        'Implement configuration-driven directory management'
                    ]
                }
            }
        };
        const reportPath = '/workspaces/agent-feed/src/nld/reports/working-directory-nld-report.json';
        // Ensure directory exists
        await fs.promises.mkdir('/workspaces/agent-feed/src/nld/reports', { recursive: true });
        await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
        return {
            reportPath,
            patterns: patterns,
            antiPatterns: antiPatterns.patterns,
            neuralTrainingData: neuralData.patternData,
            summary: report.summary
        };
    }
}
exports.WorkingDirectoryMonitor = WorkingDirectoryMonitor;
//# sourceMappingURL=working-directory-monitor.js.map