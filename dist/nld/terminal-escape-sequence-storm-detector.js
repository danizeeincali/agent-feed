"use strict";
/**
 * Terminal Escape Sequence Storm Detector
 * Detects and analyzes ANSI escape sequence storms in terminal output
 * Part of NLD (Neuro-Learning Development) system
 *
 * Patterns detected:
 * - [?25l (hide cursor) repetition storms
 * - [?25h (show cursor) repetition storms
 * - [?2004h (enable bracketed paste) repetition storms
 * - Message duplication patterns (Claude welcome messages)
 * - Transition from escape sequences to text repetition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalEscapeSequenceStormDetector = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class TerminalEscapeSequenceStormDetector extends events_1.EventEmitter {
    detectedPatterns = [];
    stormPatterns = [];
    patternStorage;
    sequenceBuffer = new Map();
    stormThreshold = 50; // Repetitions to trigger storm detection
    timeWindowMs = 30000; // 30 seconds
    // Known ANSI escape sequences
    knownSequences = {
        '[?25l': 'cursor_control', // Hide cursor
        '[?25h': 'cursor_control', // Show cursor
        '[?2004h': 'bracketed_paste', // Enable bracketed paste
        '[?2004l': 'bracketed_paste', // Disable bracketed paste
        '[2J': 'screen_control', // Clear entire screen
        '[H': 'screen_control', // Move cursor to home position
        '[0m': 'screen_control', // Reset all attributes
        '[1m': 'screen_control', // Bold
        '[31m': 'screen_control', // Red text
        '[32m': 'screen_control', // Green text
        '[33m': 'screen_control', // Yellow text
        '[34m': 'screen_control', // Blue text
    };
    constructor(storageDir) {
        super();
        this.patternStorage = (0, path_1.join)(storageDir, 'terminal-escape-sequence-storm-patterns.json');
        this.loadExistingPatterns();
        this.setupCleanupInterval();
        console.log('🔍 Terminal Escape Sequence Storm Detector initialized');
    }
    /**
     * Analyze terminal output for escape sequence storms
     */
    analyzeTerminalOutput(output, instanceId) {
        const chunks = this.extractEscapeSequences(output);
        const now = Date.now();
        for (const chunk of chunks) {
            if (chunk.type === 'escape_sequence') {
                this.trackSequenceRepetition(chunk.content, now);
            }
            else if (chunk.type === 'message') {
                this.trackMessageRepetition(chunk.content, now);
            }
        }
        // Check for storm patterns
        this.checkForStormPatterns(instanceId);
    }
    /**
     * Extract escape sequences and messages from terminal output
     */
    extractEscapeSequences(output) {
        const chunks = [];
        const escapePattern = /\x1b\[[?]?[0-9]*[a-zA-Z]/g;
        let lastIndex = 0;
        let match;
        while ((match = escapePattern.exec(output)) !== null) {
            // Add any text before this escape sequence
            if (match.index > lastIndex) {
                const textContent = output.slice(lastIndex, match.index).trim();
                if (textContent) {
                    chunks.push({ type: 'message', content: textContent });
                }
            }
            // Add the escape sequence
            const sequence = match[0].replace('\x1b', ''); // Remove ESC character for pattern matching
            chunks.push({ type: 'escape_sequence', content: sequence });
            lastIndex = match.index + match[0].length;
        }
        // Add any remaining text
        if (lastIndex < output.length) {
            const textContent = output.slice(lastIndex).trim();
            if (textContent) {
                chunks.push({ type: 'message', content: textContent });
            }
        }
        return chunks;
    }
    /**
     * Track escape sequence repetitions
     */
    trackSequenceRepetition(sequence, timestamp) {
        const key = `seq:${sequence}`;
        const existing = this.sequenceBuffer.get(key);
        if (existing) {
            existing.count++;
            existing.lastSeen = timestamp;
        }
        else {
            this.sequenceBuffer.set(key, {
                count: 1,
                firstSeen: timestamp,
                lastSeen: timestamp
            });
        }
    }
    /**
     * Track message repetitions
     */
    trackMessageRepetition(message, timestamp) {
        // Only track specific known problematic messages
        const knownProblematicMessages = [
            'Hello! Welcome to Claude instance terminal',
            'Claude Code session started',
            '[RESPONSE] Claude Code session started',
            '> hello',
            'Connection active',
            'Terminal connected to Claude instance'
        ];
        const matchedMessage = knownProblematicMessages.find(known => message.includes(known) || known.includes(message.slice(0, 50)));
        if (matchedMessage) {
            const key = `msg:${matchedMessage}`;
            const existing = this.sequenceBuffer.get(key);
            if (existing) {
                existing.count++;
                existing.lastSeen = timestamp;
            }
            else {
                this.sequenceBuffer.set(key, {
                    count: 1,
                    firstSeen: timestamp,
                    lastSeen: timestamp
                });
            }
        }
    }
    /**
     * Check for storm patterns
     */
    checkForStormPatterns(instanceId) {
        const now = Date.now();
        const stormSequences = [];
        const stormMessages = [];
        let totalRepetitions = 0;
        let earliestTime = now;
        let latestTime = 0;
        // Check sequence buffer for storms
        for (const [key, data] of this.sequenceBuffer.entries()) {
            if (data.count >= this.stormThreshold) {
                const timeSpan = data.lastSeen - data.firstSeen;
                if (timeSpan <= this.timeWindowMs) {
                    totalRepetitions += data.count;
                    earliestTime = Math.min(earliestTime, data.firstSeen);
                    latestTime = Math.max(latestTime, data.lastSeen);
                    if (key.startsWith('seq:')) {
                        stormSequences.push(key.replace('seq:', ''));
                    }
                    else if (key.startsWith('msg:')) {
                        stormMessages.push(key.replace('msg:', ''));
                    }
                    // Create individual pattern record
                    this.recordEscapeSequencePattern(key, data, instanceId);
                }
            }
        }
        // Create storm pattern if we have significant activity
        if (stormSequences.length > 0 || stormMessages.length > 0) {
            this.recordStormPattern(stormSequences, stormMessages, totalRepetitions, latestTime - earliestTime, instanceId);
        }
    }
    /**
     * Record individual escape sequence pattern
     */
    recordEscapeSequencePattern(key, data, instanceId) {
        const content = key.startsWith('seq:') ? key.replace('seq:', '') : key.replace('msg:', '');
        const isSequence = key.startsWith('seq:');
        const pattern = {
            patternId: `escape-pattern-${instanceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sequence: isSequence ? content : '',
            sequenceType: isSequence ? this.classifySequence(content) : 'unknown',
            repetitionCount: data.count,
            timeWindow: data.lastSeen - data.firstSeen,
            detectedAt: new Date().toISOString(),
            associatedMessage: isSequence ? undefined : content,
            severity: this.calculateSeverity(data.count),
            rootCause: this.analyzeRootCause(content, data.count),
            technicalDetails: {
                processSpawns: this.estimateProcessSpawns(data.count),
                sseConnections: this.estimateSSEConnections(data.count),
                clickEvents: this.estimateClickEvents(content, data.count),
                bufferSize: content.length * data.count
            }
        };
        this.detectedPatterns.push(pattern);
        this.persistPatterns();
        this.emit('escapeSequencePatternDetected', pattern);
        console.warn(`🌪️ Escape Sequence Storm: ${content} repeated ${data.count} times in ${data.lastSeen - data.firstSeen}ms`);
    }
    /**
     * Record storm pattern
     */
    recordStormPattern(sequences, messages, totalRepetitions, durationMs, instanceId) {
        const storm = {
            stormId: `storm-${instanceId}-${Date.now()}`,
            stormType: this.classifyStorm(sequences, messages),
            sequences,
            messages,
            totalRepetitions,
            durationMs,
            detectedAt: new Date().toISOString(),
            severity: this.calculateStormSeverity(totalRepetitions, durationMs),
            rootCause: this.analyzeStormRootCause(sequences, messages, totalRepetitions),
            preventionStrategy: this.suggestPreventionStrategy(sequences, messages)
        };
        this.stormPatterns.push(storm);
        this.persistPatterns();
        this.emit('terminalStormDetected', storm);
        console.error(`🌪️ Terminal Storm Detected: ${storm.stormType} with ${totalRepetitions} repetitions over ${durationMs}ms`);
    }
    /**
     * Classify escape sequence type
     */
    classifySequence(sequence) {
        return this.knownSequences[sequence] || 'unknown';
    }
    /**
     * Calculate pattern severity
     */
    calculateSeverity(repetitionCount) {
        if (repetitionCount >= 1000)
            return 'critical';
        if (repetitionCount >= 500)
            return 'high';
        if (repetitionCount >= 100)
            return 'medium';
        return 'low';
    }
    /**
     * Analyze root cause of pattern
     */
    analyzeRootCause(content, repetitionCount) {
        if (content.includes('[?25')) {
            return 'pty_config_issue'; // Cursor control issues often relate to PTY config
        }
        if (content.includes('[?2004')) {
            return 'pty_config_issue'; // Bracketed paste issues
        }
        if (content.includes('Claude') || content.includes('hello')) {
            return 'process_multiplication'; // Claude process being spawned multiple times
        }
        if (repetitionCount > 500) {
            return 'button_click_storm'; // Extremely high repetition suggests UI event storm
        }
        return 'unknown';
    }
    /**
     * Estimate process spawns from repetition count
     */
    estimateProcessSpawns(repetitionCount) {
        // Each process spawn typically generates 3-5 escape sequences
        return Math.ceil(repetitionCount / 4);
    }
    /**
     * Estimate SSE connections from repetition count
     */
    estimateSSEConnections(repetitionCount) {
        // Each SSE connection might generate multiple sequences
        return Math.ceil(repetitionCount / 10);
    }
    /**
     * Estimate click events from content and repetition
     */
    estimateClickEvents(content, repetitionCount) {
        if (content.includes('hello') || content.includes('Claude')) {
            // User repeatedly clicking "Start" button
            return Math.ceil(repetitionCount / 3);
        }
        return 0;
    }
    /**
     * Classify storm type
     */
    classifyStorm(sequences, messages) {
        if (sequences.length > 0 && messages.length > 0)
            return 'mixed_storm';
        if (sequences.length > 0)
            return 'escape_sequence_storm';
        return 'message_duplication_storm';
    }
    /**
     * Calculate storm severity
     */
    calculateStormSeverity(totalRepetitions, durationMs) {
        const ratePerSecond = totalRepetitions / (durationMs / 1000);
        if (ratePerSecond >= 100 || totalRepetitions >= 5000)
            return 'critical';
        if (ratePerSecond >= 50 || totalRepetitions >= 2000)
            return 'high';
        if (ratePerSecond >= 20 || totalRepetitions >= 500)
            return 'medium';
        return 'low';
    }
    /**
     * Analyze storm root cause
     */
    analyzeStormRootCause(sequences, messages, totalRepetitions) {
        if (sequences.includes('[?25l') && sequences.includes('[?25h')) {
            return 'PTY cursor control infinite loop - likely multiple process spawns with conflicting terminal settings';
        }
        if (sequences.includes('[?2004h')) {
            return 'Bracketed paste mode being enabled repeatedly - indicates PTY configuration reset loop';
        }
        if (messages.some(msg => msg.includes('Claude')) && totalRepetitions > 1000) {
            return 'Claude process multiplication - button click storm causing rapid process spawning';
        }
        if (messages.some(msg => msg.includes('hello'))) {
            return 'User input echo loop - input being processed multiple times through duplicate connections';
        }
        return 'Unknown terminal I/O storm - requires deeper analysis';
    }
    /**
     * Suggest prevention strategy
     */
    suggestPreventionStrategy(sequences, messages) {
        if (sequences.includes('[?25l') || sequences.includes('[?25h')) {
            return 'TDD: Add PTY configuration validation tests, implement process spawn debouncing, test cursor state management';
        }
        if (sequences.includes('[?2004h')) {
            return 'TDD: Test bracketed paste mode lifecycle, validate PTY session cleanup, test terminal state persistence';
        }
        if (messages.some(msg => msg.includes('Claude'))) {
            return 'TDD: Test button click debouncing, validate process lifecycle management, test SSE connection deduplication';
        }
        return 'TDD: Implement comprehensive terminal I/O testing, validate connection management, test event handler cleanup';
    }
    /**
     * Get detected patterns
     */
    getDetectedPatterns() {
        return [...this.detectedPatterns];
    }
    /**
     * Get storm patterns
     */
    getStormPatterns() {
        return [...this.stormPatterns];
    }
    /**
     * Get pattern statistics
     */
    getPatternStatistics() {
        const severityBreakdown = this.detectedPatterns.reduce((acc, pattern) => {
            acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
            return acc;
        }, {});
        const rootCauseBreakdown = this.detectedPatterns.reduce((acc, pattern) => {
            acc[pattern.rootCause] = (acc[pattern.rootCause] || 0) + 1;
            return acc;
        }, {});
        // Find most common patterns
        const sequenceCounts = new Map();
        const messageCounts = new Map();
        this.detectedPatterns.forEach(pattern => {
            if (pattern.sequence) {
                sequenceCounts.set(pattern.sequence, (sequenceCounts.get(pattern.sequence) || 0) + pattern.repetitionCount);
            }
            if (pattern.associatedMessage) {
                messageCounts.set(pattern.associatedMessage, (messageCounts.get(pattern.associatedMessage) || 0) + pattern.repetitionCount);
            }
        });
        const mostCommonSequence = Array.from(sequenceCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const mostCommonMessage = Array.from(messageCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        return {
            totalPatterns: this.detectedPatterns.length,
            totalStorms: this.stormPatterns.length,
            severityBreakdown,
            rootCauseBreakdown,
            mostCommonSequence,
            mostCommonMessage
        };
    }
    /**
     * Setup periodic cleanup
     */
    setupCleanupInterval() {
        setInterval(() => {
            this.cleanupOldPatterns();
        }, 60000); // Clean up every minute
    }
    /**
     * Clean up old patterns from buffer
     */
    cleanupOldPatterns() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        for (const [key, data] of this.sequenceBuffer.entries()) {
            if (data.lastSeen < cutoff) {
                this.sequenceBuffer.delete(key);
            }
        }
    }
    /**
     * Load existing patterns from storage
     */
    loadExistingPatterns() {
        try {
            if ((0, fs_1.existsSync)(this.patternStorage)) {
                const data = (0, fs_1.readFileSync)(this.patternStorage, 'utf8');
                const parsed = JSON.parse(data);
                this.detectedPatterns = parsed.patterns || [];
                this.stormPatterns = parsed.storms || [];
                console.log(`📂 Loaded ${this.detectedPatterns.length} escape sequence patterns and ${this.stormPatterns.length} storm patterns`);
            }
        }
        catch (error) {
            console.error('Failed to load existing escape sequence patterns:', error);
        }
    }
    /**
     * Persist patterns to storage
     */
    persistPatterns() {
        try {
            const data = {
                patterns: this.detectedPatterns,
                storms: this.stormPatterns,
                lastUpdated: new Date().toISOString()
            };
            (0, fs_1.writeFileSync)(this.patternStorage, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Failed to persist escape sequence patterns:', error);
        }
    }
    /**
     * Clear all patterns (for testing)
     */
    clearPatterns() {
        this.detectedPatterns = [];
        this.stormPatterns = [];
        this.sequenceBuffer.clear();
    }
    /**
     * Simulate storm for testing
     */
    simulateStorm(sequences, repetitions, instanceId) {
        const now = Date.now();
        sequences.forEach(seq => {
            for (let i = 0; i < repetitions; i++) {
                this.trackSequenceRepetition(seq, now + i);
            }
        });
        this.checkForStormPatterns(instanceId);
    }
}
exports.TerminalEscapeSequenceStormDetector = TerminalEscapeSequenceStormDetector;
exports.default = TerminalEscapeSequenceStormDetector;
//# sourceMappingURL=terminal-escape-sequence-storm-detector.js.map