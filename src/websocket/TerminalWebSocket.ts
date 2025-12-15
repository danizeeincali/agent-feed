/**
 * Terminal WebSocket Handler
 * 
 * Manages WebSocket connections for terminal communication,
 * multi-tab synchronization, and process management.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { processManager, ProcessInfo } from '../services/ProcessManager';
import * as pty from 'node-pty';
import { platform } from 'os';

interface TerminalSession {
  id: string;
  pty: pty.IPty | null;
  sockets: Set<string>;
  buffer: string[];
  maxBufferSize: number;
}

export class TerminalWebSocket {
  private io: SocketIOServer;
  private sessions: Map<string, TerminalSession> = new Map();
  private readonly SHARED_SESSION_ID = 'shared-terminal';
  private readonly MAX_BUFFER_SIZE = 1000; // lines

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupProcessManagerListeners();
    this.initializeSharedSession();
  }

  /**
   * Initialize the shared terminal session
   */
  private initializeSharedSession(): void {
    // Create a PTY instance for the terminal
    const shell = platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: processManager['config'].workingDirectory,
      env: process.env as { [key: string]: string }
    });

    const session: TerminalSession = {
      id: this.SHARED_SESSION_ID,
      pty: ptyProcess,
      sockets: new Set(),
      buffer: [],
      maxBufferSize: this.MAX_BUFFER_SIZE
    };

    // Handle PTY output
    ptyProcess.onData((data) => {
      this.addToBuffer(session, data);
      this.broadcastToSession(this.SHARED_SESSION_ID, {
        type: 'output',
        data,
        timestamp: new Date()
      });
    });

    this.sessions.set(this.SHARED_SESSION_ID, session);
  }

  /**
   * Setup ProcessManager event listeners
   */
  private setupProcessManagerListeners(): void {
    // Forward process output to terminal
    processManager.on('terminal:output', (data) => {
      this.broadcastToSession(this.SHARED_SESSION_ID, {
        type: 'process-output',
        ...data
      });
    });

    processManager.on('launched', (info: ProcessInfo) => {
      this.broadcastToAll({
        type: 'instance-launched',
        info
      });
    });

    processManager.on('killed', (data) => {
      this.broadcastToAll({
        type: 'instance-killed',
        ...data
      });
    });

    processManager.on('error', (error) => {
      this.broadcastToAll({
        type: 'process-error',
        error: error.message
      });
    });

    processManager.on('auto-restart-triggered', () => {
      this.broadcastToAll({
        type: 'auto-restart',
        message: 'Auto-restart triggered'
      });
    });
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket: Socket): void {
    console.log(`Terminal socket connected: ${socket.id}`);

    // Join shared session
    socket.join(this.SHARED_SESSION_ID);
    
    const session = this.sessions.get(this.SHARED_SESSION_ID);
    if (session) {
      session.sockets.add(socket.id);
      
      // Send current buffer to new connection
      socket.emit('terminal:buffer', {
        buffer: session.buffer.join(''),
        sessionId: this.SHARED_SESSION_ID
      });

      // Send current process info
      socket.emit('process:info', processManager.getProcessInfo());
    }

    // Handle terminal input
    socket.on('terminal:input', (data: string) => {
      const session = this.sessions.get(this.SHARED_SESSION_ID);
      if (session?.pty) {
        session.pty.write(data);
      }
    });

    // Handle terminal resize
    socket.on('terminal:resize', ({ cols, rows }) => {
      const session = this.sessions.get(this.SHARED_SESSION_ID);
      if (session?.pty) {
        session.pty.resize(cols, rows);
      }
    });

    // Handle process management commands
    socket.on('process:launch', async (config) => {
      try {
        const info = await processManager.launchInstance(config);
        socket.emit('process:launched', info);
      } catch (error: any) {
        socket.emit('process:error', { 
          message: error.message,
          action: 'launch'
        });
      }
    });

    socket.on('process:kill', async () => {
      try {
        await processManager.killInstance();
        socket.emit('process:killed');
      } catch (error: any) {
        socket.emit('process:error', {
          message: error.message,
          action: 'kill'
        });
      }
    });

    socket.on('process:restart', async () => {
      try {
        const info = await processManager.restartInstance();
        socket.emit('process:restarted', info);
      } catch (error: any) {
        socket.emit('process:error', {
          message: error.message,
          action: 'restart'
        });
      }
    });

    socket.on('process:config', (config) => {
      processManager.updateConfig(config);
      socket.emit('process:config-updated', config);
    });

    socket.on('process:info', () => {
      socket.emit('process:info', processManager.getProcessInfo());
    });

    // Handle command execution in terminal
    socket.on('terminal:command', (command: string) => {
      const session = this.sessions.get(this.SHARED_SESSION_ID);
      if (session?.pty) {
        // Add command to buffer for history
        this.addToBuffer(session, `$ ${command}\n`);
        
        // Execute command
        session.pty.write(`${command}\n`);
        
        // Broadcast command to all tabs
        this.broadcastToSession(this.SHARED_SESSION_ID, {
          type: 'command',
          data: command,
          from: socket.id,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Terminal socket disconnected: ${socket.id}`);
      const session = this.sessions.get(this.SHARED_SESSION_ID);
      if (session) {
        session.sockets.delete(socket.id);
      }
    });
  }

  /**
   * Add data to session buffer
   */
  private addToBuffer(session: TerminalSession, data: string): void {
    // Split into lines and add to buffer
    const lines = data.split('\n');
    session.buffer.push(...lines);
    
    // Trim buffer if too large
    if (session.buffer.length > session.maxBufferSize) {
      session.buffer = session.buffer.slice(-session.maxBufferSize);
    }
  }

  /**
   * Broadcast to all sockets in a session
   */
  private broadcastToSession(sessionId: string, data: any): void {
    this.io.to(sessionId).emit('terminal:data', {
      sessionId,
      ...data
    });
  }

  /**
   * Broadcast to all connected sockets
   */
  private broadcastToAll(data: any): void {
    this.io.emit('terminal:broadcast', data);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    for (const session of this.sessions.values()) {
      if (session.pty) {
        session.pty.kill();
      }
    }
    this.sessions.clear();
  }
}

export default TerminalWebSocket;