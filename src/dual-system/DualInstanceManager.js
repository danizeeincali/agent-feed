/**
 * Dual Instance Manager
 * Handles communication and coordination between development and production Claude instances
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class DualInstanceManager extends EventEmitter {
  constructor() {
    super();
    this.devConfig = null;
    this.prodConfig = null;
    this.communicationQueue = '/tmp/claude-communication/';
    this.isInitialized = false;
    this.messageProcessingInterval = null;
    
    // Message sequence tracking
    this.messageSequence = 0;
    this.pendingConfirmations = new Map();
    this.messageHistory = [];
  }

  async initialize() {
    try {
      // Ensure communication directory exists
      await fs.mkdir(this.communicationQueue, { recursive: true });
      
      // Load configurations
      await this.loadConfigurations();
      
      // Start message processing
      this.startMessageProcessing();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('🔄 Dual Instance Manager initialized successfully');
      console.log(`📁 Communication queue: ${this.communicationQueue}`);
      console.log(`⚙️  Dev config loaded: ${!!this.devConfig}`);
      console.log(`⚙️  Prod config loaded: ${!!this.prodConfig}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Dual Instance Manager:', error);
      throw error;
    }
  }

  async loadConfigurations() {
    try {
      const devConfigPath = '/workspaces/agent-feed/.claude/dev/config.json';
      const prodConfigPath = '/workspaces/agent-feed/.claude/prod/config.json';
      
      const [devConfigData, prodConfigData] = await Promise.all([
        fs.readFile(devConfigPath, 'utf8'),
        fs.readFile(prodConfigPath, 'utf8')
      ]);
      
      this.devConfig = JSON.parse(devConfigData);
      this.prodConfig = JSON.parse(prodConfigData);
      
    } catch (error) {
      console.error('❌ Failed to load configurations:', error);
      throw error;
    }
  }

  /**
   * Send message from development instance to production
   * Auto-handoff enabled (no confirmation required)
   */
  async sendDevToProduction(task, context = {}) {
    const message = {
      id: `dev-to-prod-${++this.messageSequence}`,
      timestamp: new Date().toISOString(),
      source: 'development',
      target: 'production',
      type: 'handoff',
      priority: 'medium',
      payload: {
        action: 'execute_task',
        task: task,
        context: context
      },
      security: {
        requiresConfirmation: false,
        permissions: ['agent-execution'],
        auditLevel: 'detailed'
      }
    };

    await this.queueMessage(message);
    this.emit('message_sent', message);
    
    console.log(`📤 Dev → Prod handoff: ${task}`);
    return message.id;
  }

  /**
   * Send message from production instance to development
   * Requires user confirmation
   */
  async sendProductionToDev(action, reason, data = {}) {
    const message = {
      id: `prod-to-dev-${++this.messageSequence}`,
      timestamp: new Date().toISOString(),
      source: 'production',
      target: 'development',
      type: 'request',
      priority: 'high',
      payload: {
        action: action,
        reason: reason,
        data: data
      },
      security: {
        requiresConfirmation: true,
        permissions: ['development-access'],
        auditLevel: 'full'
      }
    };

    // Add to pending confirmations
    this.pendingConfirmations.set(message.id, {
      message: message,
      timestamp: Date.now(),
      timeout: 30000 // 30 seconds
    });

    await this.queueMessage(message);
    this.emit('confirmation_required', message);
    
    console.log(`🔒 Prod → Dev request requires confirmation: ${action}`);
    console.log(`💭 Reason: ${reason}`);
    
    return message.id;
  }

  /**
   * User confirms or denies a production → development request
   */
  async handleUserConfirmation(messageId, approved, userComment = '') {
    const pending = this.pendingConfirmations.get(messageId);
    
    if (!pending) {
      throw new Error(`Message ${messageId} not found in pending confirmations`);
    }

    const response = {
      id: `confirmation-${messageId}`,
      timestamp: new Date().toISOString(),
      originalMessageId: messageId,
      approved: approved,
      userComment: userComment,
      processed: false
    };

    if (approved) {
      // Execute the requested action
      await this.executeMessage(pending.message);
      console.log(`✅ User approved request ${messageId}: ${pending.message.payload.action}`);
    } else {
      console.log(`❌ User denied request ${messageId}: ${pending.message.payload.action}`);
    }

    // Clean up
    this.pendingConfirmations.delete(messageId);
    this.emit('confirmation_processed', response);
    
    // Log to audit trail
    await this.logAuditEvent('user_confirmation', {
      messageId: messageId,
      approved: approved,
      action: pending.message.payload.action,
      userComment: userComment
    });

    return response;
  }

  /**
   * Queue a message for processing
   */
  async queueMessage(message) {
    const queueFile = path.join(
      this.communicationQueue,
      `${message.target}-queue.json`
    );
    
    try {
      // Read existing queue
      let queue = [];
      try {
        const existingData = await fs.readFile(queueFile, 'utf8');
        queue = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is empty, start with empty queue
      }
      
      // Add message to queue
      queue.push(message);
      
      // Write back to file
      await fs.writeFile(queueFile, JSON.stringify(queue, null, 2));
      
      // Add to message history
      this.messageHistory.push(message);
      if (this.messageHistory.length > 1000) {
        this.messageHistory = this.messageHistory.slice(-500); // Keep last 500
      }
      
    } catch (error) {
      console.error(`❌ Failed to queue message:`, error);
      throw error;
    }
  }

  /**
   * Process messages from queue
   */
  async processQueue(instanceType) {
    const queueFile = path.join(
      this.communicationQueue,
      `${instanceType}-queue.json`
    );
    
    try {
      const data = await fs.readFile(queueFile, 'utf8');
      const queue = JSON.parse(data);
      
      if (queue.length === 0) return;
      
      console.log(`📥 Processing ${queue.length} messages for ${instanceType}`);
      
      // Process each message
      for (const message of queue) {
        try {
          if (message.security.requiresConfirmation && !this.pendingConfirmations.has(message.id)) {
            // Skip messages that require confirmation but haven't been confirmed
            continue;
          }
          
          await this.executeMessage(message);
          this.emit('message_processed', message);
          
        } catch (error) {
          console.error(`❌ Failed to process message ${message.id}:`, error);
          this.emit('message_error', { message, error });
        }
      }
      
      // Clear processed messages (except those pending confirmation)
      const remainingMessages = queue.filter(msg => 
        msg.security.requiresConfirmation && this.pendingConfirmations.has(msg.id)
      );
      
      await fs.writeFile(queueFile, JSON.stringify(remainingMessages, null, 2));
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Failed to process queue for ${instanceType}:`, error);
      }
    }
  }

  /**
   * Execute a message
   */
  async executeMessage(message) {
    console.log(`⚡ Executing message: ${message.type} - ${message.payload.action}`);
    
    switch (message.type) {
      case 'handoff':
        await this.handleHandoff(message);
        break;
      case 'request':
        await this.handleRequest(message);
        break;
      case 'status':
        await this.handleStatusMessage(message);
        break;
      default:
        console.warn(`⚠️  Unknown message type: ${message.type}`);
    }
    
    // Log execution
    await this.logAuditEvent('message_executed', {
      messageId: message.id,
      type: message.type,
      action: message.payload.action,
      source: message.source,
      target: message.target
    });
  }

  async handleHandoff(message) {
    // Handle dev → prod handoff
    if (message.source === 'development' && message.target === 'production') {
      console.log(`🔄 Executing handoff task: ${message.payload.task}`);
      
      // In a real implementation, this would interface with the production Claude instance
      // For now, we'll simulate the handoff
      this.emit('handoff_executed', {
        task: message.payload.task,
        context: message.payload.context,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleRequest(message) {
    // Handle prod → dev request (after confirmation)
    if (message.source === 'production' && message.target === 'development') {
      console.log(`🔧 Executing development request: ${message.payload.action}`);
      
      // In a real implementation, this would interface with the development Claude instance
      this.emit('dev_request_executed', {
        action: message.payload.action,
        reason: message.payload.reason,
        data: message.payload.data,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleStatusMessage(message) {
    console.log(`📊 Status update from ${message.source}: ${JSON.stringify(message.payload)}`);
    this.emit('status_update', message);
  }

  /**
   * Start periodic message processing
   */
  startMessageProcessing() {
    if (this.messageProcessingInterval) {
      clearInterval(this.messageProcessingInterval);
    }
    
    this.messageProcessingInterval = setInterval(async () => {
      await this.processQueue('development');
      await this.processQueue('production');
      await this.cleanupExpiredConfirmations();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Clean up expired confirmation requests
   */
  async cleanupExpiredConfirmations() {
    const now = Date.now();
    const expired = [];
    
    for (const [messageId, pending] of this.pendingConfirmations.entries()) {
      if (now - pending.timestamp > pending.timeout) {
        expired.push(messageId);
      }
    }
    
    for (const messageId of expired) {
      const pending = this.pendingConfirmations.get(messageId);
      console.log(`⏰ Confirmation request expired: ${messageId}`);
      
      this.pendingConfirmations.delete(messageId);
      this.emit('confirmation_expired', pending.message);
      
      await this.logAuditEvent('confirmation_expired', {
        messageId: messageId,
        action: pending.message.payload.action
      });
    }
  }

  /**
   * Log audit events
   */
  async logAuditEvent(event, data) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      data: data,
      sessionId: `dual-instance-${Date.now()}`
    };
    
    const auditFile = path.join(this.communicationQueue, 'audit.log');
    const logLine = JSON.stringify(auditEntry) + '\n';
    
    try {
      await fs.appendFile(auditFile, logLine);
    } catch (error) {
      console.error('❌ Failed to write audit log:', error);
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      messageSequence: this.messageSequence,
      pendingConfirmations: this.pendingConfirmations.size,
      messageHistory: this.messageHistory.length,
      devConfig: !!this.devConfig,
      prodConfig: !!this.prodConfig,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(limit = 50) {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Get pending confirmations
   */
  getPendingConfirmations() {
    return Array.from(this.pendingConfirmations.values()).map(pending => ({
      message: pending.message,
      timeRemaining: Math.max(0, pending.timeout - (Date.now() - pending.timestamp))
    }));
  }

  /**
   * Shutdown the manager
   */
  async shutdown() {
    if (this.messageProcessingInterval) {
      clearInterval(this.messageProcessingInterval);
    }
    
    console.log('🔄 Dual Instance Manager shutting down...');
    this.emit('shutdown');
  }
}

module.exports = DualInstanceManager;