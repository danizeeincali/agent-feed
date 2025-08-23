/**
 * Advanced WebSocket Terminal Streaming Service
 * Provides robust terminal streaming with session management, authentication, and security
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { spawn, IPty } from 'node-pty';
import * as os from 'os';
import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';

interface TerminalSession {
  sessionId: string;
  ptyProcess: IPty;
  socket: Socket;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  isAlive: boolean;
  metadata: {
    shell: string;
    cwd: string;
    cols: number;
    rows: number;
    env: Record<string, string>;
  };
}

interface TerminalConfig {
  shell?: string;
  cwd?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
  maxSessions?: number;
  sessionTimeout?: number;
  authentication?: boolean;
}

export class TerminalStreamingService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private io: SocketIOServer;
  private config: Required<TerminalConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer, config: TerminalConfig = {}) {
    super();
    this.io = io;
    this.config = {
      shell: config.shell || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash'),
      cwd: config.cwd || process.cwd(),
      cols: config.cols || 80,
      rows: config.rows || 24,
      env: config.env || process.env,
      maxSessions: config.maxSessions || 100,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      authentication: config.authentication || false
    };
    
    this.setupNamespace();
    this.startCleanupProcess();
  }

  private setupNamespace(): void {
    const terminalNamespace = this.io.of('/terminal');
    
    // Authentication middleware if enabled
    if (this.config.authentication) {
      terminalNamespace.use((socket, next) => {
        const token = socket.handshake.auth.token;
        // Add your authentication logic here
        if (!token) {
          return next(new Error('Authentication required'));
        }
        // Validate token and set user context
        // socket.userId = validatedUserId;
        next();
      });
    }
    
    terminalNamespace.on('connection', (socket: Socket) => {
      logger.info('Terminal client connected', { 
        socketId: socket.id,
        userId: (socket as any).userId 
      });
      
      // Rate limiting per socket
      this.setupRateLimiting(socket);
      
      // Terminal session management
      socket.on('terminal:create', (data: TerminalConfig) => {
        this.createSession(socket, data);
      });
      
      socket.on('terminal:input', (data: { sessionId?: string; input: string }) => {
        this.handleInput(socket, data);
      });
      
      socket.on('terminal:resize', (data: { sessionId?: string; cols: number; rows: number }) => {
        this.handleResize(socket, data);
      });
      
      socket.on('terminal:kill', (data: { sessionId?: string }) => {
        this.killSession(socket, data.sessionId);
      });
      
      socket.on('terminal:list', () => {
        this.listSessions(socket);
      });
      
      socket.on('disconnect', (reason: string) => {
        this.handleDisconnection(socket, reason);
      });
      
      // Enhanced error handling
      socket.on('error', (error: Error) => {
        logger.error('Terminal socket error', { 
          socketId: socket.id, 
          error: error.message 
        });
        this.handleSocketError(socket, error);
      });
    });
  }

  private setupRateLimiting(socket: Socket): void {
    const rateLimiter = {
      commands: 0,
      resetTime: Date.now() + 60000, // 1 minute window
      maxCommands: 1000 // Max commands per minute
    };
    
    (socket as any).rateLimiter = rateLimiter;
  }

  private checkRateLimit(socket: Socket): boolean {
    const rateLimiter = (socket as any).rateLimiter;
    const now = Date.now();
    
    if (now > rateLimiter.resetTime) {
      rateLimiter.commands = 0;
      rateLimiter.resetTime = now + 60000;
    }
    
    if (rateLimiter.commands >= rateLimiter.maxCommands) {
      socket.emit('terminal:error', {
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      });
      return false;
    }
    
    rateLimiter.commands++;
    return true;
  }

  private createSession(socket: Socket, config: TerminalConfig = {}): void {
    try {
      if (!this.checkRateLimit(socket)) return;
      
      // Check session limits
      const userSessions = Array.from(this.sessions.values())
        .filter(session => session.socket.id === socket.id);
      
      if (userSessions.length >= 5) { // Max 5 sessions per socket
        socket.emit('terminal:error', {
          error: 'Maximum sessions limit reached',
          maxSessions: 5,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (this.sessions.size >= this.config.maxSessions) {
        socket.emit('terminal:error', {
          error: 'Server session limit reached',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      const sessionId = this.generateSessionId();
      const sessionConfig = {
        shell: config.shell || this.config.shell,
        cwd: config.cwd || this.config.cwd,
        cols: config.cols || this.config.cols,
        rows: config.rows || this.config.rows,
        env: { ...this.config.env, ...config.env }
      };
      
      // Create PTY process
      const ptyProcess = spawn(sessionConfig.shell, [], {
        name: 'xterm-color',
        cols: sessionConfig.cols,
        rows: sessionConfig.rows,
        cwd: sessionConfig.cwd,
        env: sessionConfig.env
      });
      
      // Create session record
      const session: TerminalSession = {
        sessionId,
        ptyProcess,
        socket,
        userId: (socket as any).userId,
        startTime: new Date(),
        lastActivity: new Date(),
        isAlive: true,
        metadata: sessionConfig
      };
      
      this.sessions.set(sessionId, session);
      
      // Handle PTY output
      ptyProcess.on('data', (data: string) => {
        session.lastActivity = new Date();
        socket.emit('terminal:output', {
          sessionId,
          data,
          timestamp: new Date().toISOString()
        });
        
        this.emit('session:output', { sessionId, data });
      });
      
      // Handle PTY exit
      ptyProcess.on('exit', (exitCode: number) => {
        logger.info('Terminal session exited', { sessionId, exitCode });
        
        session.isAlive = false;
        socket.emit('terminal:exit', {
          sessionId,
          exitCode,
          timestamp: new Date().toISOString()
        });
        
        this.sessions.delete(sessionId);
        this.emit('session:exit', { sessionId, exitCode });
      });
      
      // Send session created response
      socket.emit('terminal:created', {
        sessionId,
        ...sessionConfig,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Terminal session created', { 
        sessionId, 
        socketId: socket.id,
        userId: session.userId 
      });
      
      this.emit('session:created', { sessionId, session });
      
    } catch (error) {
      logger.error('Failed to create terminal session', { error: error.message });
      socket.emit('terminal:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleInput(socket: Socket, data: { sessionId?: string; input: string }): void {
    if (!this.checkRateLimit(socket)) return;
    
    const sessionId = data.sessionId || this.getDefaultSessionId(socket);
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      socket.emit('terminal:error', {
        error: 'Session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (session.socket.id !== socket.id) {
      socket.emit('terminal:error', {
        error: 'Unauthorized session access',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      session.ptyProcess.write(data.input);
      session.lastActivity = new Date();
      
      this.emit('session:input', { sessionId, input: data.input });
      
    } catch (error) {
      logger.error('Failed to write to terminal', { sessionId, error: error.message });
      socket.emit('terminal:error', {
        error: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleResize(socket: Socket, data: { sessionId?: string; cols: number; rows: number }): void {
    if (!this.checkRateLimit(socket)) return;
    
    const sessionId = data.sessionId || this.getDefaultSessionId(socket);
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      socket.emit('terminal:error', {
        error: 'Session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (session.socket.id !== socket.id) {
      socket.emit('terminal:error', {
        error: 'Unauthorized session access',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      session.ptyProcess.resize(data.cols, data.rows);
      session.metadata.cols = data.cols;
      session.metadata.rows = data.rows;
      session.lastActivity = new Date();
      
      logger.debug('Terminal resized', { sessionId, cols: data.cols, rows: data.rows });
      
      this.emit('session:resize', { sessionId, cols: data.cols, rows: data.rows });
      
    } catch (error) {
      logger.error('Failed to resize terminal', { sessionId, error: error.message });
      socket.emit('terminal:error', {
        error: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private killSession(socket: Socket, sessionId?: string): void {
    if (!this.checkRateLimit(socket)) return;
    
    sessionId = sessionId || this.getDefaultSessionId(socket);
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      socket.emit('terminal:error', {
        error: 'Session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (session.socket.id !== socket.id) {
      socket.emit('terminal:error', {
        error: 'Unauthorized session access',
        sessionId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      session.ptyProcess.kill();
      session.isAlive = false;
      this.sessions.delete(sessionId);
      
      socket.emit('terminal:killed', {
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Terminal session killed', { sessionId });
      this.emit('session:killed', { sessionId });
      
    } catch (error) {
      logger.error('Failed to kill terminal session', { sessionId, error: error.message });
      socket.emit('terminal:error', {
        error: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private listSessions(socket: Socket): void {
    if (!this.checkRateLimit(socket)) return;
    
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.socket.id === socket.id)
      .map(session => ({
        sessionId: session.sessionId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        isAlive: session.isAlive,
        metadata: session.metadata
      }));
    
    socket.emit('terminal:sessions', {
      sessions: userSessions,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    logger.info('Terminal client disconnected', { 
      socketId: socket.id, 
      reason,
      userId: (socket as any).userId 
    });
    
    // Clean up all sessions for this socket
    const sessionsToRemove = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.socket.id === socket.id);
    
    for (const [sessionId, session] of sessionsToRemove) {
      try {
        session.ptyProcess.kill();
        session.isAlive = false;
        this.sessions.delete(sessionId);
        
        logger.debug('Cleaned up terminal session on disconnect', { sessionId });
        this.emit('session:cleanup', { sessionId, reason: 'disconnect' });
        
      } catch (error) {
        logger.error('Error cleaning up session on disconnect', { 
          sessionId, 
          error: error.message 
        });
      }
    }
  }

  private handleSocketError(socket: Socket, error: Error): void {
    logger.error('Terminal socket error occurred', { 
      socketId: socket.id, 
      error: error.message 
    });
    
    socket.emit('terminal:error', {
      error: 'Socket error occurred',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupStaleSessions(): void {
    const now = new Date();
    const staleSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceActivity > this.config.sessionTimeout || !session.isAlive) {
        staleSessions.push(sessionId);
      }
    }
    
    for (const sessionId of staleSessions) {
      const session = this.sessions.get(sessionId);
      if (session) {
        try {
          session.ptyProcess.kill();
          session.isAlive = false;
          this.sessions.delete(sessionId);
          
          logger.info('Cleaned up stale terminal session', { sessionId });
          this.emit('session:cleanup', { sessionId, reason: 'stale' });
          
        } catch (error) {
          logger.error('Error cleaning up stale session', { 
            sessionId, 
            error: error.message 
          });
        }
      }
    }
    
    if (staleSessions.length > 0) {
      logger.info('Cleanup completed', { cleanedSessions: staleSessions.length });
    }
  }

  private generateSessionId(): string {
    return `term_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getDefaultSessionId(socket: Socket): string {
    // Return the first session ID for this socket, or create a new one
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.socket.id === socket.id);
    
    return userSessions.length > 0 ? userSessions[0][0] : '';
  }

  // Public methods for external access
  public getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isAlive).length,
      sessionsByUser: this.getSessionsByUser(),
      serverConfig: {
        maxSessions: this.config.maxSessions,
        sessionTimeout: this.config.sessionTimeout
      }
    };
  }

  private getSessionsByUser(): Record<string, number> {
    const userCounts: Record<string, number> = {};
    
    for (const session of this.sessions.values()) {
      const userId = session.userId || 'anonymous';
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    }
    
    return userCounts;
  }

  public broadcastToSessions(event: string, data: any): void {
    this.io.of('/terminal').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public destroy(): void {
    // Clean up all sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.ptyProcess.kill();
        this.sessions.delete(sessionId);
      } catch (error) {
        logger.error('Error destroying session', { sessionId, error: error.message });
      }
    }
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('Terminal streaming service destroyed');
  }
}

export default TerminalStreamingService;