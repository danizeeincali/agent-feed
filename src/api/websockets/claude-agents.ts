/**
 * Claude Code Agent WebSocket Integration
 * Provides real-time communication for Claude agents
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { claudeIntegrationService, ClaudeSession, ClaudeAgent, ClaudeTask } from '@/services/claude-integration';
import { logger } from '@/utils/logger';

interface ClaudeSocketData {
  userId: string;
  sessionIds: Set<string>;
  subscribedAgents: Set<string>;
  subscribedTasks: Set<string>;
}

interface ClaudeSocket extends Socket {
  claudeData?: ClaudeSocketData;
}

export class ClaudeAgentWebSocketManager {
  private io: SocketIOServer | null = null;
  private connectedSockets: Map<string, ClaudeSocket> = new Map();
  private isInitialized = false;

  /**
   * Initialize WebSocket manager with Socket.IO server
   */
  initialize(io: SocketIOServer): void {
    if (this.isInitialized) {
      logger.warn('Claude WebSocket manager already initialized');
      return;
    }

    this.io = io;
    this.setupNamespace();
    this.setupOrchestratorEvents();
    this.isInitialized = true;
    
    logger.info('Claude Agent WebSocket manager initialized');
  }

  /**
   * Setup Claude-specific namespace
   */
  private setupNamespace(): void {
    if (!this.io) return;

    const claudeNamespace = this.io.of('/claude');

    claudeNamespace.use(this.authenticateSocket.bind(this));

    claudeNamespace.on('connection', (socket: ClaudeSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Authenticate socket connection
   */
  private async authenticateSocket(socket: ClaudeSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!userId) {
        return next(new Error('User ID required for Claude WebSocket'));
      }

      // Initialize Claude socket data
      socket.claudeData = {
        userId,
        sessionIds: new Set(),
        subscribedAgents: new Set(),
        subscribedTasks: new Set()
      };

      next();
    } catch (error) {
      next(new Error('Claude WebSocket authentication failed'));
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: ClaudeSocket): void {
    const userId = socket.claudeData?.userId;
    logger.info(`Claude WebSocket client connected: ${socket.id} (User: ${userId})`);

    this.connectedSockets.set(socket.id, socket);

    // Setup event handlers
    this.setupSocketEvents(socket);

    // Send welcome message with available sessions
    this.sendUserSessions(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEvents(socket: ClaudeSocket): void {
    // Session management
    socket.on('claude:session:subscribe', (sessionId: string) => {
      this.handleSessionSubscribe(socket, sessionId);
    });

    socket.on('claude:session:unsubscribe', (sessionId: string) => {
      this.handleSessionUnsubscribe(socket, sessionId);
    });

    socket.on('claude:session:create', (config: any) => {
      this.handleSessionCreate(socket, config);
    });

    socket.on('claude:session:terminate', (sessionId: string) => {
      this.handleSessionTerminate(socket, sessionId);
    });

    // Agent management
    socket.on('claude:agent:subscribe', (agentId: string) => {
      this.handleAgentSubscribe(socket, agentId);
    });

    socket.on('claude:agent:unsubscribe', (agentId: string) => {
      this.handleAgentUnsubscribe(socket, agentId);
    });

    socket.on('claude:agent:spawn', (data: { sessionId: string; agentType: string; config?: any }) => {
      this.handleAgentSpawn(socket, data);
    });

    // Task management
    socket.on('claude:task:subscribe', (taskId: string) => {
      this.handleTaskSubscribe(socket, taskId);
    });

    socket.on('claude:task:unsubscribe', (taskId: string) => {
      this.handleTaskUnsubscribe(socket, taskId);
    });

    socket.on('claude:task:orchestrate', (data: { sessionId: string; taskConfig: any }) => {
      this.handleTaskOrchestrate(socket, data);
    });

    // Workflow management
    socket.on('claude:workflow:execute', (data: { sessionId: string; workflowId: string }) => {
      this.handleWorkflowExecute(socket, data);
    });

    // Real-time requests
    socket.on('claude:metrics:request', () => {
      this.handleMetricsRequest(socket);
    });

    socket.on('claude:health:request', () => {
      this.handleHealthRequest(socket);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Claude WebSocket error from ${socket.id}:`, error);
      socket.emit('claude:error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle session subscription
   */
  private handleSessionSubscribe(socket: ClaudeSocket, sessionId: string): void {
    if (!socket.claudeData) return;

    socket.join(`claude:session:${sessionId}`);
    socket.claudeData.sessionIds.add(sessionId);

    logger.debug(`Socket ${socket.id} subscribed to Claude session ${sessionId}`);

    // Send current session state
    const session = claudeCodeOrchestrator.getSession(sessionId);
    if (session) {
      socket.emit('claude:session:state', {
        sessionId,
        session,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle session unsubscription
   */
  private handleSessionUnsubscribe(socket: ClaudeSocket, sessionId: string): void {
    if (!socket.claudeData) return;

    socket.leave(`claude:session:${sessionId}`);
    socket.claudeData.sessionIds.delete(sessionId);

    logger.debug(`Socket ${socket.id} unsubscribed from Claude session ${sessionId}`);
  }

  /**
   * Handle session creation
   */
  private async handleSessionCreate(socket: ClaudeSocket, config: any): Promise<void> {
    if (!socket.claudeData) return;

    try {
      const session = await claudeCodeOrchestrator.createSession(socket.claudeData.userId, config);
      
      socket.emit('claude:session:created', {
        session,
        timestamp: new Date().toISOString()
      });

      // Auto-subscribe to new session
      this.handleSessionSubscribe(socket, session.id);
    } catch (error) {
      socket.emit('claude:session:create_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle session termination
   */
  private async handleSessionTerminate(socket: ClaudeSocket, sessionId: string): Promise<void> {
    try {
      await claudeCodeOrchestrator.terminateSession(sessionId);
      
      socket.emit('claude:session:terminated', {
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('claude:session:terminate_failed', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle agent subscription
   */
  private handleAgentSubscribe(socket: ClaudeSocket, agentId: string): void {
    if (!socket.claudeData) return;

    socket.join(`claude:agent:${agentId}`);
    socket.claudeData.subscribedAgents.add(agentId);

    logger.debug(`Socket ${socket.id} subscribed to Claude agent ${agentId}`);

    // Send current agent state
    const agent = claudeIntegrationService.getAgent(agentId);
    if (agent) {
      socket.emit('claude:agent:state', {
        agentId,
        agent,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle agent unsubscription
   */
  private handleAgentUnsubscribe(socket: ClaudeSocket, agentId: string): void {
    if (!socket.claudeData) return;

    socket.leave(`claude:agent:${agentId}`);
    socket.claudeData.subscribedAgents.delete(agentId);

    logger.debug(`Socket ${socket.id} unsubscribed from Claude agent ${agentId}`);
  }

  /**
   * Handle agent spawning
   */
  private async handleAgentSpawn(socket: ClaudeSocket, data: { sessionId: string; agentType: string; config?: any }): Promise<void> {
    try {
      const agent = await claudeCodeOrchestrator.spawnAgent(data.sessionId, data.agentType, data.config);
      
      socket.emit('claude:agent:spawned', {
        agent,
        timestamp: new Date().toISOString()
      });

      // Auto-subscribe to new agent
      this.handleAgentSubscribe(socket, agent.id);
    } catch (error) {
      socket.emit('claude:agent:spawn_failed', {
        sessionId: data.sessionId,
        agentType: data.agentType,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle task subscription
   */
  private handleTaskSubscribe(socket: ClaudeSocket, taskId: string): void {
    if (!socket.claudeData) return;

    socket.join(`claude:task:${taskId}`);
    socket.claudeData.subscribedTasks.add(taskId);

    logger.debug(`Socket ${socket.id} subscribed to Claude task ${taskId}`);

    // Send current task state
    const task = claudeIntegrationService.getTask(taskId);
    if (task) {
      socket.emit('claude:task:state', {
        taskId,
        task,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle task unsubscription
   */
  private handleTaskUnsubscribe(socket: ClaudeSocket, taskId: string): void {
    if (!socket.claudeData) return;

    socket.leave(`claude:task:${taskId}`);
    socket.claudeData.subscribedTasks.delete(taskId);

    logger.debug(`Socket ${socket.id} unsubscribed from Claude task ${taskId}`);
  }

  /**
   * Handle task orchestration
   */
  private async handleTaskOrchestrate(socket: ClaudeSocket, data: { sessionId: string; taskConfig: any }): Promise<void> {
    try {
      const task = await claudeCodeOrchestrator.orchestrateTask(data.sessionId, data.taskConfig);
      
      socket.emit('claude:task:orchestrated', {
        task,
        timestamp: new Date().toISOString()
      });

      // Auto-subscribe to new task
      this.handleTaskSubscribe(socket, task.id);
    } catch (error) {
      socket.emit('claude:task:orchestrate_failed', {
        sessionId: data.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle workflow execution
   */
  private async handleWorkflowExecute(socket: ClaudeSocket, data: { sessionId: string; workflowId: string }): Promise<void> {
    try {
      await claudeCodeOrchestrator.executeWorkflow(data.sessionId, data.workflowId);
      
      socket.emit('claude:workflow:started', {
        sessionId: data.sessionId,
        workflowId: data.workflowId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('claude:workflow:failed', {
        sessionId: data.sessionId,
        workflowId: data.workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle metrics request
   */
  private handleMetricsRequest(socket: ClaudeSocket): void {
    const metrics = claudeCodeOrchestrator.getMetrics();
    socket.emit('claude:metrics', {
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle health request
   */
  private handleHealthRequest(socket: ClaudeSocket): void {
    const metrics = claudeCodeOrchestrator.getMetrics();
    const isHealthy = metrics.systemLoad < 0.8 && metrics.activeAgents > 0;

    socket.emit('claude:health', {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: ClaudeSocket): void {
    const userId = socket.claudeData?.userId;
    logger.info(`Claude WebSocket client disconnected: ${socket.id} (User: ${userId})`);

    this.connectedSockets.delete(socket.id);
  }

  /**
   * Send user sessions to socket
   */
  private sendUserSessions(socket: ClaudeSocket): void {
    if (!socket.claudeData) return;

    const sessions = claudeCodeOrchestrator.getUserSessions(socket.claudeData.userId);
    socket.emit('claude:sessions', {
      sessions,
      count: sessions.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup orchestrator event listeners
   */
  private setupOrchestratorEvents(): void {
    claudeCodeOrchestrator.on('session:created', (session: ClaudeSession) => {
      this.broadcastToUser(session.userId, 'claude:session:created', { session });
    });

    claudeCodeOrchestrator.on('session:terminated', (session: ClaudeSession) => {
      this.broadcast(`claude:session:${session.id}`, 'claude:session:terminated', { sessionId: session.id });
    });

    claudeCodeOrchestrator.on('agent:spawned', (agent: ClaudeAgent) => {
      const session = claudeIntegrationService.getSession(agent.id.split('-')[0]); // Simplified session lookup
      if (session) {
        this.broadcast(`claude:session:${session.id}`, 'claude:agent:spawned', { agent });
      }
    });

    claudeCodeOrchestrator.on('agent:terminated', (agent: ClaudeAgent) => {
      this.broadcast(`claude:agent:${agent.id}`, 'claude:agent:terminated', { agentId: agent.id });
    });

    claudeCodeOrchestrator.on('task:created', (task: ClaudeTask) => {
      this.broadcast(`claude:session:${task.sessionId}`, 'claude:task:created', { task });
    });

    claudeCodeOrchestrator.on('task:completed', (task: ClaudeTask) => {
      this.broadcast(`claude:task:${task.id}`, 'claude:task:completed', { task });
    });

    claudeCodeOrchestrator.on('task:failed', (task: ClaudeTask) => {
      this.broadcast(`claude:task:${task.id}`, 'claude:task:failed', { task });
    });

    claudeCodeOrchestrator.on('workflow:completed', (data: { sessionId: string; workflowId: string }) => {
      this.broadcast(`claude:session:${data.sessionId}`, 'claude:workflow:completed', data);
    });

    claudeCodeOrchestrator.on('workflow:failed', (data: { sessionId: string; workflowId: string; error: any }) => {
      this.broadcast(`claude:session:${data.sessionId}`, 'claude:workflow:failed', data);
    });

    claudeCodeOrchestrator.on('health:check', (metrics) => {
      this.broadcastToAll('claude:metrics:update', { metrics });
    });
  }

  /**
   * Broadcast message to specific room
   */
  private broadcast(room: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.of('/claude').to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToAll(event: string, data: any): void {
    if (!this.io) return;

    this.io.of('/claude').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to specific user
   */
  private broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    // Find sockets for this user
    for (const socket of this.connectedSockets.values()) {
      if (socket.claudeData?.userId === userId) {
        socket.emit(event, {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.connectedSockets.size;
  }

  /**
   * Shutdown WebSocket manager
   */
  shutdown(): void {
    if (!this.isInitialized) return;

    // Disconnect all clients
    for (const socket of this.connectedSockets.values()) {
      socket.disconnect(true);
    }

    this.connectedSockets.clear();
    this.isInitialized = false;
    
    logger.info('Claude Agent WebSocket manager shutdown');
  }
}

// Create and export manager instance
export const claudeAgentWebSocketManager = new ClaudeAgentWebSocketManager();