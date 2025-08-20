#!/usr/bin/env node

/**
 * NLD Auto-Trigger Integration
 * Integrates with claude-flow hooks for automatic pattern detection
 */

const fs = require('fs');
const path = require('path');
const { NLDDetector } = require('./detection-triggers');

class AutoTrigger {
  constructor() {
    this.detector = new NLDDetector();
    this.sessionContext = {
      lastClaudeResponse: null,
      currentTask: null,
      sessionId: process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`
    };
  }

  /**
   * Hook: pre-task - Called before Claude starts working on a task
   */
  async preTaskHook(taskDescription) {
    console.log(`NLD: Pre-task hook - ${taskDescription}`);
    
    this.sessionContext.currentTask = taskDescription;
    this.sessionContext.taskStartTime = Date.now();
    
    // Log task start
    await this.logActivity('task_start', {
      task: taskDescription,
      timestamp: new Date().toISOString()
    });
    
    return { status: 'ready', task: taskDescription };
  }

  /**
   * Hook: post-task - Called after Claude completes a task
   */
  async postTaskHook(taskId, result) {
    console.log(`NLD: Post-task hook - Task ${taskId} completed`);
    
    this.sessionContext.lastClaudeResponse = result;
    this.sessionContext.lastTaskCompletion = Date.now();
    
    // Log task completion
    await this.logActivity('task_complete', {
      task_id: taskId,
      result: result,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.sessionContext.taskStartTime
    });
    
    return { status: 'logged', task_id: taskId };
  }

  /**
   * Hook: post-edit - Called after Claude edits a file
   */
  async postEditHook(filePath, memoryKey) {
    console.log(`NLD: Post-edit hook - File ${filePath} edited`);
    
    // Track file modifications for context
    this.sessionContext.lastEditedFile = filePath;
    this.sessionContext.lastEditTime = Date.now();
    
    // Log edit activity
    await this.logActivity('file_edit', {
      file: filePath,
      memory_key: memoryKey,
      timestamp: new Date().toISOString()
    });
    
    return { status: 'tracked', file: filePath };
  }

  /**
   * Hook: user-message - Called when user sends a message (key integration point)
   */
  async userMessageHook(userMessage) {
    console.log(`NLD: User message hook - Processing: "${userMessage.substring(0, 50)}..."`);
    
    // This is the critical detection point
    if (this.sessionContext.lastClaudeResponse) {
      const detection = this.detector.detectFeedbackPattern(
        userMessage, 
        this.sessionContext.lastClaudeResponse
      );
      
      if (detection) {
        console.log(`NLD: Pattern detected - ${detection.type}`);
        
        // Create NLT record
        const taskContext = {
          originalTask: this.sessionContext.currentTask,
          sessionId: this.sessionContext.sessionId,
          lastEditedFile: this.sessionContext.lastEditedFile
        };
        
        try {
          const record = await this.detector.createNLTRecord(detection, taskContext);
          
          // Log successful detection
          await this.logActivity('pattern_detected', {
            record_id: record.record_id,
            pattern_type: detection.type,
            timestamp: new Date().toISOString()
          });
          
          // Notify user (optional - can be disabled for silent operation)
          if (process.env.NLD_NOTIFY_USER === 'true') {
            console.log(`🧠 NLD: Captured ${detection.type} pattern (Record: ${record.record_id})`);
          }
          
          return {
            status: 'pattern_detected',
            record_id: record.record_id,
            type: detection.type
          };
          
        } catch (error) {
          console.error('NLD: Error creating record:', error.message);
          return { status: 'error', error: error.message };
        }
      }
    }
    
    return { status: 'no_pattern_detected' };
  }

  /**
   * Hook: notify - Called for general notifications
   */
  async notifyHook(message) {
    // Check if this is a completion notification we should track
    if (message.includes('completed') || message.includes('finished') || message.includes('done')) {
      await this.logActivity('completion_notification', {
        message: message,
        timestamp: new Date().toISOString()
      });
    }
    
    return { status: 'noted', message: message };
  }

  /**
   * Hook: session-restore - Called when restoring session context
   */
  async sessionRestoreHook(sessionId) {
    console.log(`NLD: Session restore hook - ${sessionId}`);
    
    this.sessionContext.sessionId = sessionId;
    
    // Try to restore previous context
    const contextFile = path.join('.claude-flow/nld', 'sessions', `${sessionId}.json`);
    
    if (fs.existsSync(contextFile)) {
      try {
        const savedContext = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
        this.sessionContext = { ...this.sessionContext, ...savedContext };
        console.log('NLD: Session context restored');
      } catch (error) {
        console.error('NLD: Error restoring session context:', error.message);
      }
    }
    
    return { status: 'restored', session_id: sessionId };
  }

  /**
   * Hook: session-end - Called when session ends
   */
  async sessionEndHook(exportMetrics = true) {
    console.log(`NLD: Session end hook - ${this.sessionContext.sessionId}`);
    
    if (exportMetrics) {
      await this.exportSessionMetrics();
    }
    
    // Save session context
    await this.saveSessionContext();
    
    return { 
      status: 'session_ended', 
      session_id: this.sessionContext.sessionId,
      metrics_exported: exportMetrics 
    };
  }

  /**
   * Integration with claude-flow neural training
   */
  async triggerNeuralTraining() {
    try {
      // Use claude-flow MCP to trigger neural training with our data
      const { NeuralDataExporter } = require('../neural/training-data-export');
      const exporter = new NeuralDataExporter();
      
      const trainingData = await exporter.exportTrainingData();
      
      // This would integrate with claude-flow MCP neural training
      // For now, we'll just log that data is ready
      console.log(`NLD: Training data ready - ${trainingData.metadata.total_records} records`);
      
      return {
        status: 'training_data_ready',
        records: trainingData.metadata.total_records
      };
      
    } catch (error) {
      console.error('NLD: Error preparing training data:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Log NLD activities for debugging and monitoring
   */
  async logActivity(activityType, data) {
    const logDir = '.claude-flow/nld/logs';
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionContext.sessionId,
      activity_type: activityType,
      data: data
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('NLD: Error writing log:', error.message);
    }
  }

  /**
   * Export session metrics for analysis
   */
  async exportSessionMetrics() {
    const metricsDir = '.claude-flow/nld/metrics';
    const metricsFile = path.join(metricsDir, `session-${this.sessionContext.sessionId}.json`);
    
    // Ensure metrics directory exists
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
    
    const sessionMetrics = {
      session_id: this.sessionContext.sessionId,
      start_time: this.sessionContext.taskStartTime,
      end_time: Date.now(),
      duration: Date.now() - (this.sessionContext.taskStartTime || Date.now()),
      tasks_processed: this.sessionContext.currentTask ? 1 : 0,
      files_edited: this.sessionContext.lastEditedFile ? 1 : 0,
      patterns_detected: await this.countSessionPatterns(),
      context: {
        last_task: this.sessionContext.currentTask,
        last_file: this.sessionContext.lastEditedFile,
        last_response_length: this.sessionContext.lastClaudeResponse?.length || 0
      }
    };
    
    try {
      fs.writeFileSync(metricsFile, JSON.stringify(sessionMetrics, null, 2));
      console.log(`NLD: Session metrics exported to ${metricsFile}`);
    } catch (error) {
      console.error('NLD: Error exporting session metrics:', error.message);
    }
  }

  /**
   * Save current session context
   */
  async saveSessionContext() {
    const sessionsDir = '.claude-flow/nld/sessions';
    const contextFile = path.join(sessionsDir, `${this.sessionContext.sessionId}.json`);
    
    // Ensure sessions directory exists
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(contextFile, JSON.stringify(this.sessionContext, null, 2));
    } catch (error) {
      console.error('NLD: Error saving session context:', error.message);
    }
  }

  /**
   * Count patterns detected in current session
   */
  async countSessionPatterns() {
    try {
      const indexFile = '.claude-flow/nld/database/index.json';
      if (!fs.existsSync(indexFile)) return 0;
      
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      const sessionRecords = index.by_timestamp?.filter(record => 
        record.record_id.includes(this.sessionContext.sessionId)
      ) || [];
      
      return sessionRecords.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Main hook handler - routes hook calls to appropriate methods
   */
  async handleHook(hookType, ...args) {
    try {
      switch (hookType) {
        case 'pre-task':
          return await this.preTaskHook(...args);
        case 'post-task':
          return await this.postTaskHook(...args);
        case 'post-edit':
          return await this.postEditHook(...args);
        case 'user-message':
          return await this.userMessageHook(...args);
        case 'notify':
          return await this.notifyHook(...args);
        case 'session-restore':
          return await this.sessionRestoreHook(...args);
        case 'session-end':
          return await this.sessionEndHook(...args);
        case 'trigger-training':
          return await this.triggerNeuralTraining(...args);
        default:
          console.log(`NLD: Unknown hook type: ${hookType}`);
          return { status: 'unknown_hook', type: hookType };
      }
    } catch (error) {
      console.error(`NLD: Error in ${hookType} hook:`, error.message);
      return { status: 'error', hook: hookType, error: error.message };
    }
  }
}

// Export for integration
module.exports = { AutoTrigger };

// CLI usage for testing hooks
if (require.main === module) {
  const trigger = new AutoTrigger();
  
  const hookType = process.argv[2];
  const args = process.argv.slice(3);
  
  if (hookType) {
    trigger.handleHook(hookType, ...args)
      .then(result => {
        console.log(`Hook ${hookType} result:`, JSON.stringify(result, null, 2));
      })
      .catch(err => console.error('Hook error:', err));
  } else {
    console.log('Usage: node auto-trigger.js <hook-type> [args...]');
    console.log('Hook types: pre-task, post-task, user-message, session-end, etc.');
  }
}