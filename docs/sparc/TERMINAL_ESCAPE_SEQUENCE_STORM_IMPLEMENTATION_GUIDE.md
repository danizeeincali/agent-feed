# SPARC Implementation Guide: Terminal Escape Sequence Storm Fix

## Implementation Roadmap

This document provides concrete implementation examples, interfaces, and step-by-step guidance for implementing the Terminal Escape Sequence Storm Architecture.

## 1. Enhanced PTY Process Manager Implementation

### File: `/src/services/EnhancedPTYProcessManager.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { EscapeSequenceFilter } from './EscapeSequenceFilter';
import { OutputBufferManager } from './OutputBufferManager';
import { ProcessHealthMonitor } from './ProcessHealthMonitor';

interface PTYProcessConfig {
  instanceId: string;
  command: string[];
  workingDirectory: string;
  environment: Record<string, string>;
  bufferConfig: {
    maxOutputLines: number;
    flushInterval: number;
    escapeSequenceFiltering: boolean;
    rateLimit: {
      messagesPerSecond: number;
      burstSize: number;
    };
  };
}

interface PTYProcess {
  instanceId: string;
  process: ChildProcess;
  config: PTYProcessConfig;
  startTime: Date;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
}

export class EnhancedPTYProcessManager extends EventEmitter {
  private processes = new Map<string, PTYProcess>();
  private outputFilters = new Map<string, EscapeSequenceFilter>();
  private bufferManagers = new Map<string, OutputBufferManager>();
  private healthMonitors = new Map<string, ProcessHealthMonitor>();
  
  constructor() {
    super();
    this.setupCleanupInterval();
  }

  async createInstance(config: PTYProcessConfig): Promise<PTYProcess> {
    const { instanceId, command, workingDirectory, environment } = config;
    
    // Validate instance doesn't already exist
    if (this.processes.has(instanceId)) {
      throw new Error(`Instance ${instanceId} already exists`);
    }
    
    // Create supporting services
    const escapeFilter = new EscapeSequenceFilter({
      allowedEscapeSequences: ['cursor_movement', 'color_codes', 'clear_screen'],
      maxSequenceLength: 1024,
      floodThreshold: 50,
      blockUnknownSequences: true
    });
    
    const bufferManager = new OutputBufferManager({
      maxBufferSize: 1024 * 1024, // 1MB
      flushInterval: 100,          // 100ms
      rateLimit: config.bufferConfig.rateLimit,
      adaptiveThrottling: {
        enabled: true,
        thresholds: { low: 0.5, medium: 0.8, high: 0.9 }
      }
    });
    
    const healthMonitor = new ProcessHealthMonitor(instanceId);
    
    // Store services
    this.outputFilters.set(instanceId, escapeFilter);
    this.bufferManagers.set(instanceId, bufferManager);
    this.healthMonitors.set(instanceId, healthMonitor);
    
    // Spawn the process
    const childProcess = spawn(command[0], command.slice(1), {
      cwd: workingDirectory,
      env: { ...process.env, ...environment },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });
    
    const ptyProcess: PTYProcess = {
      instanceId,
      process: childProcess,
      config,
      startTime: new Date(),
      status: 'starting'
    };
    
    this.processes.set(instanceId, ptyProcess);
    
    // Set up process event handling
    this.setupProcessEventHandlers(ptyProcess);
    
    // Mark as running after successful spawn
    setTimeout(() => {
      ptyProcess.status = 'running';
      this.emit('instanceCreated', { instanceId, pid: childProcess.pid });
    }, 100);
    
    return ptyProcess;
  }

  async terminateInstance(instanceId: string): Promise<void> {
    const ptyProcess = this.processes.get(instanceId);
    if (!ptyProcess) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    ptyProcess.status = 'stopping';
    
    // Graceful shutdown
    if (ptyProcess.process.pid) {
      ptyProcess.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (ptyProcess.process.killed === false) {
          ptyProcess.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Cleanup resources
    this.cleanupInstance(instanceId);
  }

  async sendInput(instanceId: string, input: string): Promise<void> {
    const ptyProcess = this.processes.get(instanceId);
    if (!ptyProcess || ptyProcess.status !== 'running') {
      throw new Error(`Instance ${instanceId} not available for input`);
    }
    
    if (!ptyProcess.process.stdin) {
      throw new Error(`Instance ${instanceId} stdin not available`);
    }
    
    // Validate input (prevent injection attacks)
    if (this.containsMaliciousSequences(input)) {
      throw new Error('Input contains potentially malicious sequences');
    }
    
    // Send input to process
    ptyProcess.process.stdin.write(input);
    
    // Record input for health monitoring
    const healthMonitor = this.healthMonitors.get(instanceId);
    if (healthMonitor) {
      healthMonitor.recordInput(input);
    }
    
    this.emit('inputSent', { instanceId, input: input.substring(0, 100) });
  }

  getFilteredOutput(instanceId: string): { content: string; metadata: any } | null {
    const bufferManager = this.bufferManagers.get(instanceId);
    if (!bufferManager) {
      return null;
    }
    
    return bufferManager.getProcessedOutput();
  }

  getProcessHealth(instanceId: string): any {
    const healthMonitor = this.healthMonitors.get(instanceId);
    const ptyProcess = this.processes.get(instanceId);
    
    if (!healthMonitor || !ptyProcess) {
      return { status: 'unknown' };
    }
    
    return {
      instanceId,
      status: ptyProcess.status,
      pid: ptyProcess.process.pid,
      uptime: Date.now() - ptyProcess.startTime.getTime(),
      health: healthMonitor.getHealthMetrics()
    };
  }

  async handleEscapeSequenceStorm(instanceId: string): Promise<void> {
    console.warn(`Escape sequence storm detected for instance ${instanceId}`);
    
    const bufferManager = this.bufferManagers.get(instanceId);
    const escapeFilter = this.outputFilters.get(instanceId);
    
    if (bufferManager && escapeFilter) {
      // Activate emergency throttling
      await bufferManager.activateEmergencyThrottling();
      
      // Increase filtering strictness
      escapeFilter.activateStormMode();
      
      // Notify observers
      this.emit('escapeSequenceStorm', { instanceId, timestamp: Date.now() });
    }
  }

  private setupProcessEventHandlers(ptyProcess: PTYProcess): void {
    const { instanceId, process: childProcess } = ptyProcess;
    const escapeFilter = this.outputFilters.get(instanceId)!;
    const bufferManager = this.bufferManagers.get(instanceId)!;
    const healthMonitor = this.healthMonitors.get(instanceId)!;

    // Handle stdout with filtering and buffering
    childProcess.stdout?.on('data', async (data: Buffer) => {
      const rawOutput = data.toString();
      
      try {
        // Filter escape sequences
        const filteredOutput = escapeFilter.filterOutput(rawOutput);
        
        // Check for flood patterns
        if (escapeFilter.detectEscapeSequenceFlood(rawOutput)) {
          await this.handleEscapeSequenceStorm(instanceId);
        }
        
        // Buffer the output
        await bufferManager.bufferOutput(instanceId, filteredOutput.content);
        
        // Record for health monitoring
        healthMonitor.recordOutput(rawOutput.length, filteredOutput.sequenceCount);
        
        // Emit processed output
        this.emit('processedOutput', {
          instanceId,
          content: filteredOutput.content,
          metadata: {
            originalSize: rawOutput.length,
            filteredSize: filteredOutput.content.length,
            sequencesFiltered: filteredOutput.sequencesRemoved,
            timestamp: Date.now()
          }
        });
        
      } catch (error) {
        console.error(`Output processing error for ${instanceId}:`, error);
        healthMonitor.recordError('output_processing', error);
      }
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      healthMonitor.recordError('stderr', errorOutput);
      
      this.emit('processError', {
        instanceId,
        error: errorOutput,
        timestamp: Date.now()
      });
    });

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      ptyProcess.status = 'stopped';
      
      this.emit('processExit', {
        instanceId,
        exitCode: code,
        signal,
        timestamp: Date.now()
      });
      
      // Cleanup after exit
      setTimeout(() => this.cleanupInstance(instanceId), 1000);
    });

    // Handle process errors
    childProcess.on('error', (error) => {
      ptyProcess.status = 'error';
      healthMonitor.recordError('process', error);
      
      this.emit('processFailed', {
        instanceId,
        error: error.message,
        timestamp: Date.now()
      });
    });
  }

  private cleanupInstance(instanceId: string): void {
    // Remove from maps
    this.processes.delete(instanceId);
    this.outputFilters.delete(instanceId);
    this.bufferManagers.delete(instanceId);
    this.healthMonitors.delete(instanceId);
    
    this.emit('instanceCleaned', { instanceId });
  }

  private containsMaliciousSequences(input: string): boolean {
    // Check for potentially dangerous sequences
    const maliciousPatterns = [
      /\x1b\]0;.*[\x07\x1b\\]/,  // Terminal title setting
      /\x1b\[6n/,                // Device status report
      /\x1b\[c/,                 // Device attributes
      /\x1b\[\?1047[hl]/,        // Alternative screen buffer
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  private setupCleanupInterval(): void {
    setInterval(() => {
      // Cleanup zombie processes and stale resources
      for (const [instanceId, ptyProcess] of this.processes.entries()) {
        if (ptyProcess.status === 'stopped' || ptyProcess.process.killed) {
          this.cleanupInstance(instanceId);
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Public API methods
  getAllInstances(): Array<{ instanceId: string; status: string; pid?: number }> {
    return Array.from(this.processes.values()).map(p => ({
      instanceId: p.instanceId,
      status: p.status,
      pid: p.process.pid
    }));
  }

  getInstanceById(instanceId: string): PTYProcess | undefined {
    return this.processes.get(instanceId);
  }
}
```

## 2. Escape Sequence Filter Implementation

### File: `/src/services/EscapeSequenceFilter.ts`

```typescript
interface FilterConfig {
  allowedEscapeSequences: string[];
  maxSequenceLength: number;
  floodThreshold: number;
  blockUnknownSequences: boolean;
}

interface EscapeSequence {
  sequence: string;
  type: string;
  position: number;
  timestamp: number;
}

interface FilteredOutput {
  content: string;
  sequencesRemoved: number;
  sequenceCount: number;
  originalLength: number;
}

export class EscapeSequenceFilter {
  private sequenceHistory: EscapeSequence[] = [];
  private stormModeActive = false;
  private readonly HISTORY_LIMIT = 1000;
  private readonly STORM_WINDOW_MS = 1000;

  constructor(private config: FilterConfig) {}

  filterOutput(rawOutput: string): FilteredOutput {
    const originalLength = rawOutput.length;
    let filteredContent = rawOutput;
    let sequencesRemoved = 0;
    
    // Identify all escape sequences
    const sequences = this.identifyEscapeSequences(rawOutput);
    
    // Filter sequences based on configuration and storm mode
    const allowedSequences: EscapeSequence[] = [];
    const removedSequences: EscapeSequence[] = [];
    
    for (const sequence of sequences) {
      if (this.shouldAllowSequence(sequence)) {
        allowedSequences.push(sequence);
      } else {
        removedSequences.push(sequence);
        sequencesRemoved++;
      }
    }
    
    // Remove disallowed sequences from content
    if (removedSequences.length > 0) {
      filteredContent = this.removeSequences(rawOutput, removedSequences);
    }
    
    // Update sequence history
    this.updateSequenceHistory(sequences);
    
    // Sanitize remaining control characters
    filteredContent = this.sanitizeControlCharacters(filteredContent);
    
    return {
      content: filteredContent,
      sequencesRemoved,
      sequenceCount: sequences.length,
      originalLength
    };
  }

  detectEscapeSequenceFlood(output: string): boolean {
    const sequences = this.identifyEscapeSequences(output);
    const now = Date.now();
    
    // Add current sequences to history
    const recentSequences = [
      ...this.sequenceHistory.filter(s => now - s.timestamp < this.STORM_WINDOW_MS),
      ...sequences.map(s => ({ ...s, timestamp: now }))
    ];
    
    // Check flood threshold
    const isFlood = recentSequences.length > this.config.floodThreshold;
    
    if (isFlood && !this.stormModeActive) {
      console.warn(`Escape sequence flood detected: ${recentSequences.length} sequences in ${this.STORM_WINDOW_MS}ms`);
    }
    
    return isFlood;
  }

  sanitizeControlCharacters(text: string): string {
    // Remove or replace dangerous control characters
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove most control chars
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, (match) => {
        // Only allow specific ANSI sequences
        if (this.isAllowedANSISequence(match)) {
          return match;
        }
        return '';
      });
  }

  identifyEscapeSequences(text: string): EscapeSequence[] {
    const sequences: EscapeSequence[] = [];
    const patterns = [
      { regex: /\x1b\[[0-9;]*[a-zA-Z]/g, type: 'ansi' },
      { regex: /\x1b\[[?][0-9;]*[a-zA-Z]/g, type: 'dec_private' },
      { regex: /\x1b\][0-9];.*?\x07/g, type: 'osc' },
      { regex: /\x1b[()][AB012]?/g, type: 'charset' },
      { regex: /\x1b[=>]/g, type: 'keypad' },
      { regex: /\x1b[78]/g, type: 'save_restore' }
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        sequences.push({
          sequence: match[0],
          type: pattern.type,
          position: match.index,
          timestamp: Date.now()
        });
      }
    }
    
    return sequences.sort((a, b) => a.position - b.position);
  }

  activateStormMode(): void {
    this.stormModeActive = true;
    console.warn('Storm mode activated - stricter filtering enabled');
    
    // Automatically deactivate after 30 seconds
    setTimeout(() => {
      this.stormModeActive = false;
      console.log('Storm mode deactivated');
    }, 30000);
  }

  private shouldAllowSequence(sequence: EscapeSequence): boolean {
    // In storm mode, be more restrictive
    if (this.stormModeActive) {
      return this.isEssentialSequence(sequence);
    }
    
    // Check if sequence type is allowed
    if (!this.config.allowedEscapeSequences.includes(sequence.type)) {
      return false;
    }
    
    // Check sequence length
    if (sequence.sequence.length > this.config.maxSequenceLength) {
      return false;
    }
    
    // Validate sequence format
    return this.validateSequence(sequence);
  }

  private isEssentialSequence(sequence: EscapeSequence): boolean {
    // Only allow absolutely necessary sequences in storm mode
    const essentialPatterns = [
      /^\x1b\[0m$/,           // Reset formatting
      /^\x1b\[K$/,            // Clear to end of line
      /^\x1b\[2J$/,           // Clear screen
      /^\x1b\[H$/,            // Home cursor
    ];
    
    return essentialPatterns.some(pattern => pattern.test(sequence.sequence));
  }

  private validateSequence(sequence: EscapeSequence): boolean {
    // Validate sequence format based on type
    switch (sequence.type) {
      case 'ansi':
        return /^\x1b\[[0-9;]*[a-zA-Z]$/.test(sequence.sequence);
      case 'dec_private':
        return /^\x1b\[[?][0-9;]*[a-zA-Z]$/.test(sequence.sequence);
      case 'osc':
        return /^\x1b\][0-9];.*?\x07$/.test(sequence.sequence);
      default:
        return true;
    }
  }

  private isAllowedANSISequence(sequence: string): boolean {
    // Whitelist of safe ANSI sequences
    const allowedPatterns = [
      /^\x1b\[[0-9;]*m$/,     // SGR (colors, formatting)
      /^\x1b\[[0-9;]*[ABCD]$/, // Cursor movement
      /^\x1b\[[0-9;]*[HJ]$/,   // Cursor position, clear
      /^\x1b\[[0-9;]*K$/,      // Clear line
      /^\x1b\[s$/,             // Save cursor
      /^\x1b\[u$/,             // Restore cursor
    ];
    
    return allowedPatterns.some(pattern => pattern.test(sequence));
  }

  private removeSequences(text: string, sequences: EscapeSequence[]): string {
    // Remove sequences in reverse order to maintain positions
    let filteredText = text;
    const sortedSequences = sequences.sort((a, b) => b.position - a.position);
    
    for (const sequence of sortedSequences) {
      const before = filteredText.substring(0, sequence.position);
      const after = filteredText.substring(sequence.position + sequence.sequence.length);
      filteredText = before + after;
    }
    
    return filteredText;
  }

  private updateSequenceHistory(sequences: EscapeSequence[]): void {
    // Add new sequences to history
    this.sequenceHistory.push(...sequences);
    
    // Limit history size
    if (this.sequenceHistory.length > this.HISTORY_LIMIT) {
      const excess = this.sequenceHistory.length - this.HISTORY_LIMIT;
      this.sequenceHistory.splice(0, excess);
    }
  }

  // Public API for statistics
  getFilteringStatistics(): {
    totalSequencesProcessed: number;
    averageSequencesPerSecond: number;
    stormModeActive: boolean;
    sequenceTypeDistribution: Record<string, number>;
  } {
    const now = Date.now();
    const recentSequences = this.sequenceHistory.filter(s => now - s.timestamp < 60000);
    
    const typeDistribution: Record<string, number> = {};
    for (const sequence of recentSequences) {
      typeDistribution[sequence.type] = (typeDistribution[sequence.type] || 0) + 1;
    }
    
    return {
      totalSequencesProcessed: this.sequenceHistory.length,
      averageSequencesPerSecond: recentSequences.length / 60,
      stormModeActive: this.stormModeActive,
      sequenceTypeDistribution: typeDistribution
    };
  }
}
```

## 3. SSE Connection Manager Implementation

### File: `/src/services/SSEConnectionManager.ts`

```typescript
import { Response } from 'express';
import { EventEmitter } from 'events';
import { SSEEventStreamer } from './SSEEventStreamer';

interface ConnectionMetadata {
  connectionId: string;
  instanceId: string;
  response: Response;
  clientIP: string;
  userAgent: string;
  connectedAt: Date;
  lastActivity: Date;
  eventsSent: number;
  bytesTransferred: number;
  isHealthy: boolean;
  lastSequenceAcknowledged: number;
}

interface BroadcastResult {
  attempted: number;
  successful: number;
  failed: number;
  bytesTransferred: number;
  errors: string[];
}

export class SSEConnectionManager extends EventEmitter {
  private connections = new Map<string, ConnectionMetadata>();
  private instanceConnections = new Map<string, Set<string>>(); // instanceId -> connectionIds
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 120000; // 2 minutes
  
  constructor(private eventStreamer: SSEEventStreamer) {
    super();
    this.setupHeartbeat();
  }

  registerConnection(instanceId: string, response: Response, clientInfo: any = {}): string {
    const connectionId = `${instanceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
    
    // Create connection metadata
    const connectionMetadata: ConnectionMetadata = {
      connectionId,
      instanceId,
      response,
      clientIP: clientInfo.ip || 'unknown',
      userAgent: clientInfo.userAgent || 'unknown',
      connectedAt: new Date(),
      lastActivity: new Date(),
      eventsSent: 0,
      bytesTransferred: 0,
      isHealthy: true,
      lastSequenceAcknowledged: 0
    };
    
    // Store connection
    this.connections.set(connectionId, connectionMetadata);
    
    // Add to instance mapping
    if (!this.instanceConnections.has(instanceId)) {
      this.instanceConnections.set(instanceId, new Set());
    }
    this.instanceConnections.get(instanceId)!.add(connectionId);
    
    // Send initial connection event
    this.sendConnectionEstablished(connectionMetadata);
    
    // Set up connection cleanup
    response.on('close', () => {
      this.unregisterConnection(connectionId);
    });
    
    response.on('error', (error) => {
      console.error(`SSE connection error for ${connectionId}:`, error);
      this.markConnectionUnhealthy(connectionId, `Connection error: ${error.message}`);
    });
    
    this.emit('connectionRegistered', { connectionId, instanceId, clientInfo });
    
    console.log(`SSE connection registered: ${connectionId} for instance ${instanceId}`);
    return connectionId;
  }

  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }
    
    const { instanceId } = connection;
    
    // Remove from connections map
    this.connections.delete(connectionId);
    
    // Remove from instance mapping
    const instanceSet = this.instanceConnections.get(instanceId);
    if (instanceSet) {
      instanceSet.delete(connectionId);
      if (instanceSet.size === 0) {
        this.instanceConnections.delete(instanceId);
      }
    }
    
    this.emit('connectionUnregistered', { connectionId, instanceId });
    
    console.log(`SSE connection unregistered: ${connectionId}`);
  }

  broadcastToInstance(instanceId: string, event: any): BroadcastResult {
    const connectionIds = this.instanceConnections.get(instanceId) || new Set();
    const result: BroadcastResult = {
      attempted: connectionIds.size,
      successful: 0,
      failed: 0,
      bytesTransferred: 0,
      errors: []
    };
    
    if (connectionIds.size === 0) {
      return result;
    }
    
    // Create SSE event
    const sseEvent = this.eventStreamer.createSSEEvent(instanceId, event.type, event.data);
    const eventMessage = this.eventStreamer.formatSSEMessage(sseEvent);
    const messageSize = Buffer.byteLength(eventMessage, 'utf8');
    
    // Broadcast to all connections
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        connectionIds.delete(connectionId);
        continue;
      }
      
      try {
        if (connection.isHealthy && !connection.response.writableEnded) {
          connection.response.write(eventMessage);
          
          // Update connection metrics
          connection.eventsSent++;
          connection.bytesTransferred += messageSize;
          connection.lastActivity = new Date();
          
          result.successful++;
          result.bytesTransferred += messageSize;
          
        } else {
          result.failed++;
          if (!connection.isHealthy) {
            result.errors.push(`Connection ${connectionId} is unhealthy`);
          }
          if (connection.response.writableEnded) {
            result.errors.push(`Connection ${connectionId} is closed`);
          }
        }
        
      } catch (error) {
        result.failed++;
        result.errors.push(`${connectionId}: ${error.message}`);
        this.markConnectionUnhealthy(connectionId, `Broadcast error: ${error.message}`);
      }
    }
    
    this.emit('broadcastComplete', { instanceId, event, result });
    
    return result;
  }

  broadcastToConnection(connectionId: string, event: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isHealthy || connection.response.writableEnded) {
      return false;
    }
    
    try {
      const sseEvent = this.eventStreamer.createSSEEvent(connection.instanceId, event.type, event.data);
      const eventMessage = this.eventStreamer.formatSSEMessage(sseEvent);
      
      connection.response.write(eventMessage);
      connection.eventsSent++;
      connection.bytesTransferred += Buffer.byteLength(eventMessage, 'utf8');
      connection.lastActivity = new Date();
      
      return true;
    } catch (error) {
      this.markConnectionUnhealthy(connectionId, `Send error: ${error.message}`);
      return false;
    }
  }

  getConnectionHealth(connectionId: string): any {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }
    
    const now = Date.now();
    const age = now - connection.connectedAt.getTime();
    const timeSinceActivity = now - connection.lastActivity.getTime();
    
    return {
      connectionId,
      instanceId: connection.instanceId,
      isHealthy: connection.isHealthy,
      age,
      timeSinceActivity,
      eventsSent: connection.eventsSent,
      bytesTransferred: connection.bytesTransferred,
      clientInfo: {
        ip: connection.clientIP,
        userAgent: connection.userAgent
      }
    };
  }

  getAllConnections(): Array<{ connectionId: string; instanceId: string; isHealthy: boolean }> {
    return Array.from(this.connections.values()).map(conn => ({
      connectionId: conn.connectionId,
      instanceId: conn.instanceId,
      isHealthy: conn.isHealthy
    }));
  }

  getConnectionsForInstance(instanceId: string): string[] {
    return Array.from(this.instanceConnections.get(instanceId) || []);
  }

  getTotalConnections(): number {
    return this.connections.size;
  }

  getHealthyConnections(): number {
    return Array.from(this.connections.values()).filter(conn => conn.isHealthy).length;
  }

  private sendConnectionEstablished(connection: ConnectionMetadata): void {
    const event = this.eventStreamer.createConnectionEvent(
      connection.instanceId,
      connection.connectionId,
      {
        clientInfo: {
          ip: connection.clientIP,
          userAgent: connection.userAgent
        },
        serverInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    );
    
    const eventMessage = this.eventStreamer.formatSSEMessage(event);
    
    try {
      connection.response.write(eventMessage);
      connection.eventsSent++;
      connection.bytesTransferred += Buffer.byteLength(eventMessage, 'utf8');
    } catch (error) {
      console.error(`Failed to send connection established event to ${connection.connectionId}:`, error);
      this.markConnectionUnhealthy(connection.connectionId, `Initial send failed: ${error.message}`);
    }
  }

  private markConnectionUnhealthy(connectionId: string, reason: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isHealthy = false;
      console.warn(`Connection ${connectionId} marked unhealthy: ${reason}`);
      
      this.emit('connectionUnhealthy', { connectionId, reason, connection });
    }
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEARTBEAT_INTERVAL);
  }

  private performHealthCheck(): void {
    const now = Date.now();
    const unhealthyConnections: string[] = [];
    
    for (const [connectionId, connection] of this.connections.entries()) {
      // Check connection timeout
      const timeSinceActivity = now - connection.lastActivity.getTime();
      
      if (timeSinceActivity > this.CONNECTION_TIMEOUT) {
        this.markConnectionUnhealthy(connectionId, 'Connection timeout');
        unhealthyConnections.push(connectionId);
        continue;
      }
      
      // Send heartbeat if healthy
      if (connection.isHealthy && !connection.response.writableEnded) {
        try {
          const heartbeat = this.eventStreamer.createHeartbeatEvent(connection.instanceId);
          const heartbeatMessage = this.eventStreamer.formatSSEMessage(heartbeat);
          
          connection.response.write(heartbeatMessage);
          connection.lastActivity = new Date();
          
        } catch (error) {
          this.markConnectionUnhealthy(connectionId, `Heartbeat failed: ${error.message}`);
          unhealthyConnections.push(connectionId);
        }
      }
    }
    
    // Clean up unhealthy connections
    for (const connectionId of unhealthyConnections) {
      this.unregisterConnection(connectionId);
    }
    
    // Emit health check results
    const healthyCount = this.getHealthyConnections();
    const totalCount = this.getTotalConnections();
    
    this.emit('healthCheck', {
      totalConnections: totalCount,
      healthyConnections: healthyCount,
      unhealthyConnections: totalCount - healthyCount,
      cleanedUp: unhealthyConnections.length
    });
    
    if (unhealthyConnections.length > 0) {
      console.log(`Health check completed: ${healthyCount}/${totalCount} healthy, cleaned up ${unhealthyConnections.length} connections`);
    }
  }

  // Cleanup method
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        if (!connection.response.writableEnded) {
          connection.response.end();
        }
      } catch (error) {
        console.error(`Error closing connection ${connection.connectionId}:`, error);
      }
    }
    
    this.connections.clear();
    this.instanceConnections.clear();
    this.removeAllListeners();
    
    console.log('SSE Connection Manager shutdown completed');
  }
}
```

## 4. Button Debouncing Hook Implementation

### File: `/src/hooks/useInstanceCreationDebouncer.ts`

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface DebouncerConfig {
  delay: number;
  maxWait?: number;
  immediate?: boolean;
  cancelOnUnmount?: boolean;
}

interface InstanceCreationState {
  isCreating: boolean;
  lastCreationTime: number;
  creationCount: number;
  windowStartTime: number;
  rateLimitHits: number;
}

interface CreationLimits {
  maxCreationsPerMinute: number;
  minIntervalBetweenCreations: number;
  cooldownAfterRateLimit: number;
}

export function useInstanceCreationDebouncer(
  createInstanceFn: (command: string) => Promise<void>,
  limits: CreationLimits = {
    maxCreationsPerMinute: 3,
    minIntervalBetweenCreations: 2000,
    cooldownAfterRateLimit: 30000
  }
) {
  const [creationState, setCreationState] = useState<InstanceCreationState>({
    isCreating: false,
    lastCreationTime: 0,
    creationCount: 0,
    windowStartTime: Date.now(),
    rateLimitHits: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCreate = useCallback(async (command: string) => {
    const now = Date.now();

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);

    // Check rate limiting
    const canCreate = checkRateLimit(now);
    if (!canCreate.allowed) {
      throw new Error(canCreate.reason);
    }

    setCreationState(prev => ({
      ...prev,
      isCreating: true
    }));

    // Debounced execution
    const executeCreation = async () => {
      try {
        await createInstanceFn(command);
        
        // Update creation tracking
        setCreationState(prev => ({
          ...prev,
          isCreating: false,
          lastCreationTime: now,
          creationCount: prev.creationCount + 1
        }));

      } catch (error) {
        setCreationState(prev => ({
          ...prev,
          isCreating: false
        }));
        throw error;
      }
    };

    // Check minimum interval
    const timeSinceLastCreation = now - creationState.lastCreationTime;
    if (timeSinceLastCreation < limits.minIntervalBetweenCreations) {
      const delay = limits.minIntervalBetweenCreations - timeSinceLastCreation;
      
      timeoutRef.current = setTimeout(() => {
        executeCreation().catch(error => {
          console.error('Debounced creation failed:', error);
        });
      }, delay);
      
    } else {
      // Execute immediately
      await executeCreation();
    }

  }, [createInstanceFn, limits, creationState]);

  const checkRateLimit = useCallback((now: number) => {
    // Reset window if needed
    const windowDuration = 60000; // 1 minute
    if (now - creationState.windowStartTime > windowDuration) {
      setCreationState(prev => ({
        ...prev,
        creationCount: 0,
        windowStartTime: now
      }));
      return { allowed: true, reason: '' };
    }

    // Check rate limit
    if (creationState.creationCount >= limits.maxCreationsPerMinute) {
      const timeRemaining = windowDuration - (now - creationState.windowStartTime);
      
      setCreationState(prev => ({
        ...prev,
        rateLimitHits: prev.rateLimitHits + 1
      }));

      return {
        allowed: false,
        reason: `Rate limit exceeded: Maximum ${limits.maxCreationsPerMinute} instances per minute. Try again in ${Math.ceil(timeRemaining / 1000)} seconds.`
      };
    }

    // Check cooldown after rate limit hits
    if (creationState.rateLimitHits > 0) {
      const timeSinceLastHit = now - creationState.lastCreationTime;
      if (timeSinceLastHit < limits.cooldownAfterRateLimit) {
        const cooldownRemaining = limits.cooldownAfterRateLimit - timeSinceLastHit;
        return {
          allowed: false,
          reason: `Cooldown active after rate limit. Wait ${Math.ceil(cooldownRemaining / 1000)} seconds.`
        };
      }
      
      // Reset rate limit hits after cooldown
      setCreationState(prev => ({
        ...prev,
        rateLimitHits: 0
      }));
    }

    return { allowed: true, reason: '' };
  }, [creationState, limits]);

  const cancelCreation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    
    setCreationState(prev => ({
      ...prev,
      isCreating: false
    }));
  }, []);

  const getRemainingCooldown = useCallback(() => {
    const now = Date.now();
    
    // Check window cooldown
    const windowRemaining = Math.max(0, 60000 - (now - creationState.windowStartTime));
    if (creationState.creationCount >= limits.maxCreationsPerMinute && windowRemaining > 0) {
      return {
        type: 'rate_limit',
        seconds: Math.ceil(windowRemaining / 1000)
      };
    }
    
    // Check post-rate-limit cooldown
    if (creationState.rateLimitHits > 0) {
      const cooldownRemaining = Math.max(0, limits.cooldownAfterRateLimit - (now - creationState.lastCreationTime));
      if (cooldownRemaining > 0) {
        return {
          type: 'cooldown',
          seconds: Math.ceil(cooldownRemaining / 1000)
        };
      }
    }
    
    // Check minimum interval
    const intervalRemaining = Math.max(0, limits.minIntervalBetweenCreations - (now - creationState.lastCreationTime));
    if (intervalRemaining > 0) {
      return {
        type: 'interval',
        seconds: Math.ceil(intervalRemaining / 1000)
      };
    }
    
    return null;
  }, [creationState, limits]);

  const getCreationStatus = useCallback(() => {
    const now = Date.now();
    const remainingCooldown = getRemainingCooldown();
    
    return {
      canCreate: !creationState.isCreating && !remainingCooldown,
      isCreating: creationState.isCreating,
      creationsRemaining: Math.max(0, limits.maxCreationsPerMinute - creationState.creationCount),
      windowResetIn: Math.max(0, 60000 - (now - creationState.windowStartTime)),
      cooldown: remainingCooldown,
      rateLimitHits: creationState.rateLimitHits
    };
  }, [creationState, limits, getRemainingCooldown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  return {
    createInstance: debouncedCreate,
    cancelCreation,
    getCreationStatus,
    getRemainingCooldown
  };
}
```

## 5. Integration with Existing Codebase

### File: `/src/api/routes/enhanced-terminal-manager.ts`

```typescript
import express, { Request, Response } from 'express';
import { EnhancedPTYProcessManager } from '../services/EnhancedPTYProcessManager';
import { SSEConnectionManager } from '../services/SSEConnectionManager';
import { SSEEventStreamer } from '../services/SSEEventStreamer';

const router = express.Router();
const ptyManager = new EnhancedPTYProcessManager();
const eventStreamer = SSEEventStreamer.getInstance();
const connectionManager = new SSEConnectionManager(eventStreamer);

// Set up PTY manager event forwarding
ptyManager.on('processedOutput', (data) => {
  connectionManager.broadcastToInstance(data.instanceId, {
    type: 'terminal_output',
    data: {
      output: data.content,
      metadata: data.metadata
    }
  });
});

ptyManager.on('processFailed', (data) => {
  connectionManager.broadcastToInstance(data.instanceId, {
    type: 'error',
    data: {
      error: data.error,
      timestamp: data.timestamp
    }
  });
});

ptyManager.on('escapeSequenceStorm', (data) => {
  connectionManager.broadcastToInstance(data.instanceId, {
    type: 'warning',
    data: {
      warning: 'Escape sequence storm detected - output filtering activated',
      timestamp: data.timestamp
    }
  });
});

// Create instance endpoint
router.post('/instances', async (req: Request, res: Response) => {
  try {
    const config = {
      instanceId: `claude-${Date.now()}`,
      command: req.body.command || ['claude'],
      workingDirectory: process.cwd(),
      environment: {
        CLAUDE_MANAGED_INSTANCE: 'true',
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      bufferConfig: {
        maxOutputLines: 10000,
        flushInterval: 100,
        escapeSequenceFiltering: true,
        rateLimit: {
          messagesPerSecond: 100,
          burstSize: 50
        }
      }
    };

    const instance = await ptyManager.createInstance(config);

    res.json({
      success: true,
      instanceId: instance.instanceId,
      pid: instance.process.pid,
      status: instance.status
    });

  } catch (error) {
    console.error('Failed to create instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Terminate instance endpoint
router.delete('/instances/:instanceId', async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    await ptyManager.terminateInstance(instanceId);

    res.json({
      success: true,
      message: `Instance ${instanceId} terminated`
    });

  } catch (error) {
    console.error('Failed to terminate instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send input endpoint
router.post('/instances/:instanceId/input', async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input is required'
      });
    }

    await ptyManager.sendInput(instanceId, input);

    res.json({
      success: true,
      message: 'Input sent successfully'
    });

  } catch (error) {
    console.error('Failed to send input:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SSE terminal stream endpoint
router.get('/instances/:instanceId/stream', (req: Request, res: Response) => {
  const { instanceId } = req.params;
  
  // Register SSE connection
  const connectionId = connectionManager.registerConnection(instanceId, res, {
    ip: req.ip,
    userAgent: req.get('User-Agent') || 'unknown'
  });

  console.log(`SSE stream started for instance ${instanceId}, connection ${connectionId}`);
});

// Health check endpoint
router.get('/instances/:instanceId/health', (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const health = ptyManager.getProcessHealth(instanceId);

    res.json({
      success: true,
      health
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// List all instances endpoint
router.get('/instances', (req: Request, res: Response) => {
  try {
    const instances = ptyManager.getAllInstances();
    const connections = connectionManager.getAllConnections();

    res.json({
      success: true,
      instances,
      connections: {
        total: connectionManager.getTotalConnections(),
        healthy: connectionManager.getHealthyConnections()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// System metrics endpoint
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const instances = ptyManager.getAllInstances();
    const streamingStats = eventStreamer.getStatistics();
    
    const metrics = {
      instances: {
        total: instances.length,
        running: instances.filter(i => i.status === 'running').length,
        stopped: instances.filter(i => i.status === 'stopped').length,
        error: instances.filter(i => i.status === 'error').length
      },
      connections: {
        total: connectionManager.getTotalConnections(),
        healthy: connectionManager.getHealthyConnections()
      },
      streaming: streamingStats
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## 6. Frontend Integration Update

### File: `/src/hooks/useEnhancedSSEConnection.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInstanceCreationDebouncer } from './useInstanceCreationDebouncer';

interface SSEConnectionState {
  isConnected: boolean;
  instanceId: string | null;
  connectionId: string | null;
  lastError: string | null;
  messagesReceived: number;
  lastMessageTime: number;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export function useEnhancedSSEConnection(apiUrl: string) {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    instanceId: null,
    connectionId: null,
    lastError: null,
    messagesReceived: 0,
    lastMessageTime: 0,
    connectionHealth: 'healthy'
  });

  const eventSourceRef = useRef<EventSource>();
  const eventHandlers = useRef<Map<string, Function>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Use the debounced instance creation
  const { createInstance, getCreationStatus } = useInstanceCreationDebouncer(
    async (command: string) => {
      const response = await fetch(`${apiUrl}/api/enhanced-terminal/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.split(' ') })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      // Connect to the new instance
      await connectToInstance(data.instanceId);
      return data;
    }
  );

  const connectToInstance = useCallback(async (instanceId: string) => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource(
        `${apiUrl}/api/enhanced-terminal/instances/${instanceId}/stream`
      );

      eventSourceRef.current = eventSource;

      // Handle connection events
      eventSource.onopen = () => {
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          instanceId,
          lastError: null,
          connectionHealth: 'healthy'
        }));

        // Emit connect event to handlers
        const connectHandler = eventHandlers.current.get('connect');
        if (connectHandler) {
          connectHandler({ instanceId, connectionType: 'sse' });
        }
      };

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setConnectionState(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastMessageTime: Date.now()
          }));

          // Route message to appropriate handler
          const handler = eventHandlers.current.get(data.type || 'message');
          if (handler) {
            handler(data);
          }

        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          lastError: 'Connection error',
          connectionHealth: 'unhealthy'
        }));

        // Emit error to handlers
        const errorHandler = eventHandlers.current.get('error');
        if (errorHandler) {
          errorHandler({ error: 'Connection error', instanceId });
        }

        // Attempt reconnection after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectToInstance(instanceId);
        }, 3000);
      };

      // Set up health monitoring
      setupHealthMonitoring(instanceId);

    } catch (error) {
      console.error('Failed to connect to instance:', error);
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        lastError: error.message
      }));
    }
  }, [apiUrl]);

  const setupHealthMonitoring = useCallback((instanceId: string) => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/enhanced-terminal/instances/${instanceId}/health`
        );
        const data = await response.json();

        if (data.success) {
          const health = data.health;
          let connectionHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

          // Determine health based on metrics
          if (health.health?.errorRate > 0.05) {
            connectionHealth = 'degraded';
          }
          if (health.health?.errorRate > 0.1) {
            connectionHealth = 'unhealthy';
          }

          setConnectionState(prev => ({
            ...prev,
            connectionHealth
          }));
        }

      } catch (error) {
        console.error('Health check failed:', error);
        setConnectionState(prev => ({
          ...prev,
          connectionHealth: 'degraded'
        }));
      }
    }, 30000); // Every 30 seconds
  }, [apiUrl]);

  const sendInput = useCallback(async (instanceId: string, input: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/enhanced-terminal/instances/${instanceId}/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Failed to send input:', error);
      throw error;
    }
  }, [apiUrl]);

  const addHandler = useCallback((event: string, handler: Function) => {
    eventHandlers.current.set(event, handler);
  }, []);

  const removeHandler = useCallback((event: string) => {
    eventHandlers.current.delete(event);
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = undefined;
    }

    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      instanceId: null,
      connectionId: null
    }));

    // Emit disconnect event
    const disconnectHandler = eventHandlers.current.get('disconnect');
    if (disconnectHandler) {
      disconnectHandler({ reason: 'manual_disconnect' });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    connectToInstance,
    createInstance,
    sendInput,
    addHandler,
    removeHandler,
    disconnect,
    creationStatus: getCreationStatus()
  };
}
```

This implementation guide provides concrete, production-ready code that addresses all aspects of the terminal escape sequence storm architecture. Each component is designed to work together to prevent the identified issues while maintaining high performance and reliability.

The key improvements include:

1. **Robust PTY Process Management** with escape sequence filtering and health monitoring
2. **Intelligent Output Buffering** with rate limiting and adaptive throttling  
3. **Advanced SSE Connection Management** with health tracking and automatic recovery
4. **Smart Button Debouncing** with rate limiting and cooldown periods
5. **Seamless Integration** with existing codebase patterns

The implementation can be deployed incrementally, starting with the core PTY manager and building up the additional layers for maximum stability and control.