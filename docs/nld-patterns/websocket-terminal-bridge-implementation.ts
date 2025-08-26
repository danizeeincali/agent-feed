/**
 * WebSocket Terminal Bridge Implementation
 * 
 * NLD Pattern Solution: Complete implementation of missing WebSocket 
 * terminal streaming services identified by NLD analysis.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import { logger } from '@/utils/logger';

/**
 * Missing Service #1: ClaudeInstanceTerminalWebSocket
 * 
 * This class bridges PTY terminal sessions with WebSocket connections,
 * enabling real-time terminal streaming to frontend clients.
 */
export class ClaudeInstanceTerminalWebSocket {
  private namespace: any;
  private activeConnections = new Map<string, Set<Socket>>();
  private sessionBridges = new Map<string, TerminalBridge>();
  
  constructor(private io: SocketIOServer) {
    // Register the missing namespace
    this.namespace = io.of('/claude-instances');
    this.setupEventHandlers();
    logger.info('ClaudeInstanceTerminalWebSocket initialized');
  }
  
  private setupEventHandlers(): void {
    this.namespace.on('connection', (socket: Socket) => {
      logger.info('Terminal WebSocket client connected', { socketId: socket.id });
      this.handleConnection(socket);
    });
  }
  
  /**
   * Handle new WebSocket connection for terminal streaming
   */
  handleConnection(socket: Socket): void {
    // Terminal session subscription
    socket.on('terminal:subscribe', (data: { instanceId: string }) => {
      const { instanceId } = data;
      
      if (!this.activeConnections.has(instanceId)) {
        this.activeConnections.set(instanceId, new Set());
      }
      
      this.activeConnections.get(instanceId)!.add(socket);
      socket.join(`terminal:${instanceId}`);
      
      logger.debug('Client subscribed to terminal', { instanceId, socketId: socket.id });
      
      // Send acknowledgment
      socket.emit('terminal:subscribed', { instanceId });
    });
    
    // Terminal input from client
    socket.on('terminal:input', (data: { instanceId: string; input: string }) => {
      const bridge = this.sessionBridges.get(data.instanceId);
      if (bridge) {
        bridge.writeInput(data.input);
      }
    });
    
    // Terminal resize
    socket.on('terminal:resize', (data: { instanceId: string; cols: number; rows: number }) => {
      const bridge = this.sessionBridges.get(data.instanceId);
      if (bridge) {
        bridge.resize(data.cols, data.rows);
      }
    });
    
    // Unsubscribe
    socket.on('terminal:unsubscribe', (data: { instanceId: string }) => {
      const { instanceId } = data;
      const connections = this.activeConnections.get(instanceId);
      if (connections) {
        connections.delete(socket);
        if (connections.size === 0) {
          this.activeConnections.delete(instanceId);
        }
      }
      socket.leave(`terminal:${instanceId}`);
    });
    
    // Cleanup on disconnect
    socket.on('disconnect', () => {
      // Remove socket from all connections
      for (const [instanceId, connections] of this.activeConnections) {
        connections.delete(socket);
        if (connections.size === 0) {
          this.activeConnections.delete(instanceId);
        }
      }
      logger.debug('Terminal WebSocket client disconnected', { socketId: socket.id });
    });
  }
  
  /**
   * Bridge PTY session to WebSocket - THE MISSING LINK
   */
  bridgePtyToSocket(instanceId: string, ptyProcess: pty.IPty): void {
    const bridge = new TerminalBridge(instanceId, ptyProcess, this.namespace);
    this.sessionBridges.set(instanceId, bridge);
    
    // Forward PTY data to WebSocket clients
    ptyProcess.onData((data: string) => {
      this.forwardTerminalData(instanceId, data);
    });
    
    ptyProcess.onExit(() => {
      this.destroyBridge(instanceId);
    });
    
    logger.info('PTY bridge created for WebSocket streaming', { instanceId });
  }
  
  /**
   * Forward terminal data to connected WebSocket clients - CRITICAL METHOD
   */
  forwardTerminalData(instanceId: string, data: string): void {
    // Emit to all clients subscribed to this instance
    this.namespace.to(`terminal:${instanceId}`).emit('terminal:output', {
      instanceId,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Also maintain connection tracking
    const connections = this.activeConnections.get(instanceId);
    if (connections && connections.size > 0) {
      logger.debug('Terminal data forwarded to clients', { 
        instanceId, 
        clientCount: connections.size,
        dataLength: data.length 
      });
    }
  }
  
  /**
   * Destroy bridge when PTY session ends
   */
  private destroyBridge(instanceId: string): void {
    const bridge = this.sessionBridges.get(instanceId);
    if (bridge) {
      bridge.destroy();
      this.sessionBridges.delete(instanceId);
    }
    
    // Notify clients that session ended
    this.namespace.to(`terminal:${instanceId}`).emit('terminal:session_ended', {
      instanceId,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Terminal bridge destroyed', { instanceId });
  }
  
  /**
   * Get active terminal connections count
   */
  getConnectionStats(): { [instanceId: string]: number } {
    const stats: { [instanceId: string]: number } = {};
    for (const [instanceId, connections] of this.activeConnections) {
      stats[instanceId] = connections.size;
    }
    return stats;
  }
  
  /**
   * Shutdown all bridges and connections
   */
  shutdown(): void {
    for (const bridge of this.sessionBridges.values()) {
      bridge.destroy();
    }
    this.sessionBridges.clear();
    this.activeConnections.clear();
    logger.info('ClaudeInstanceTerminalWebSocket shutdown complete');
  }
}

/**
 * Terminal Bridge Helper Class
 * 
 * Manages individual PTY-to-WebSocket bridge connections
 */
class TerminalBridge {
  constructor(
    private instanceId: string,
    private ptyProcess: pty.IPty,
    private namespace: any
  ) {}
  
  writeInput(input: string): void {
    this.ptyProcess.write(input);
  }
  
  resize(cols: number, rows: number): void {
    this.ptyProcess.resize(cols, rows);
  }
  
  destroy(): void {
    // Bridge cleanup if needed
  }
}

/**
 * Missing Service #2: TerminalStreamingService
 * 
 * Advanced terminal session management with WebSocket integration
 */
export interface StreamingOptions {
  shell?: string;
  maxSessions?: number;
  sessionTimeout?: number;
  authentication?: boolean;
}

export interface SessionOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: { [key: string]: string };
}

export class TerminalStreamingService {
  private sessions = new Map<string, TerminalSession>();
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();
  
  constructor(
    private io: SocketIOServer,
    private options: StreamingOptions
  ) {
    logger.info('TerminalStreamingService initialized', { options });
  }
  
  /**
   * Create new terminal session
   */
  createSession(sessionId: string, options: SessionOptions = {}): string {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }
    
    const ptyProcess = pty.spawn(this.options.shell || '/bin/bash', [], {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });
    
    const session = new TerminalSession(sessionId, ptyProcess, this.io);
    this.sessions.set(sessionId, session);
    
    // Set session timeout
    if (this.options.sessionTimeout) {
      const timeout = setTimeout(() => {
        this.destroySession(sessionId);
      }, this.options.sessionTimeout);
      
      this.sessionTimeouts.set(sessionId, timeout);
    }
    
    logger.info('Terminal session created', { sessionId });
    return sessionId;
  }
  
  /**
   * Destroy terminal session
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.destroy();
      this.sessions.delete(sessionId);
    }
    
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
    
    logger.info('Terminal session destroyed', { sessionId });
  }
  
  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      maxSessions: this.options.maxSessions || 50,
      sessionIds: Array.from(this.sessions.keys()),
      uptime: process.uptime()
    };
  }
  
  /**
   * Broadcast message to all sessions
   */
  broadcastToSessions(event: string, data: any): void {
    for (const session of this.sessions.values()) {
      session.broadcast(event, data);
    }
    logger.debug('Message broadcast to all sessions', { event, sessionCount: this.sessions.size });
  }
}

/**
 * Individual Terminal Session
 */
class TerminalSession {
  private clients = new Set<string>();
  
  constructor(
    private sessionId: string,
    private ptyProcess: pty.IPty,
    private io: SocketIOServer
  ) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.ptyProcess.onData((data) => {
      this.io.to(`session:${this.sessionId}`).emit('terminal:output', {
        sessionId: this.sessionId,
        data,
        timestamp: new Date().toISOString()
      });
    });
    
    this.ptyProcess.onExit(() => {
      this.io.to(`session:${this.sessionId}`).emit('terminal:session_ended', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  broadcast(event: string, data: any): void {
    this.io.to(`session:${this.sessionId}`).emit(event, data);
  }
  
  destroy(): void {
    this.ptyProcess.kill();
  }
}

/**
 * Integration Module for ClaudeInstanceManager
 * 
 * This bridges the gap between ClaudeInstanceManager and WebSocket streaming
 */
export class TerminalWebSocketIntegrator {
  constructor(
    private instanceManager: any, // ClaudeInstanceManager
    private terminalWebSocket: ClaudeInstanceTerminalWebSocket
  ) {
    this.setupIntegration();
  }
  
  private setupIntegration(): void {
    // Listen for terminal data events from ClaudeInstanceManager
    this.instanceManager.on('terminalData', (instanceId: string, data: string) => {
      // Forward to WebSocket clients - FIXES THE BROKEN CHAIN
      this.terminalWebSocket.forwardTerminalData(instanceId, data);
    });
    
    // Listen for new terminal sessions
    this.instanceManager.on('terminalSessionCreated', (instanceId: string, session: any) => {
      // Bridge the PTY to WebSocket
      this.terminalWebSocket.bridgePtyToSocket(instanceId, session.pty);
    });
    
    logger.info('Terminal WebSocket integration established');
  }
}