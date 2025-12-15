/**
 * Enhanced ProcessManager API Routes with NLD Integration
 * RESTful endpoints for process management with real-time failure pattern detection
 * Updated to use new Enhanced PTY Process Manager with escape sequence filtering
 */

import express from 'express';
import { enhancedProcessManager, ProcessConfig, EscapeSequenceFilter } from '../../services/EnhancedProcessManager';
import { sseEventStreamer } from '../../services/SSEEventStreamer';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * GET /api/process-enhanced/status
 * Get enhanced process status with NLD metrics
 */
router.get('/status', (req, res) => {
  try {
    const basicInfo = enhancedProcessManager.getProcessInfo();
    const enhancedInfo = enhancedProcessManager.getEnhancedProcessInfo();
    const healthReport = enhancedProcessManager.getNLDHealthReport();
    
    res.json({
      success: true,
      data: {
        basic: basicInfo,
        enhanced: enhancedInfo,
        health: healthReport,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/process-enhanced/launch
 * Launch Claude instance with enhanced PTY management
 */
router.post('/launch', async (req, res) => {
  try {
    const { instanceType = 'prod', command = 'claude', args = [], cwd, env = {}, ...options } = req.body;
    
    // Generate instance ID
    const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
    
    // Build process configuration
    const config: ProcessConfig = {
      command,
      args: instanceType === 'skip-permissions' ? ['--dangerously-skip-permissions', ...args] : args,
      cwd: cwd || process.env.WORKSPACE_ROOT || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        FORCE_COLOR: '1',
        CLAUDE_MANAGED_INSTANCE: 'true',
        ...env
      },
      maxMemoryMB: options.maxMemoryMB || 512,
      maxCpuPercent: options.maxCpuPercent || 80,
      maxRuntimeMs: options.maxRuntimeMs || 3600000, // 1 hour
      autoRestart: options.autoRestart || false,
      escapeSequenceFiltering: options.escapeSequenceFiltering !== false, // Default enabled
      cols: options.cols || 80,
      rows: options.rows || 24
    };
    
    logger.info('Launching enhanced Claude instance', { instanceId, config });
    
    const processInfo = await enhancedProcessManager.createInstance(instanceId, config);
    
    res.json({
      success: true,
      data: {
        instance: {
          id: instanceId,
          name: `${instanceType}/claude`,
          status: processInfo.status,
          pid: processInfo.pid,
          type: instanceType,
          created: processInfo.startTime?.toISOString(),
          command: processInfo.command,
          enhanced: {
            escapeSequenceFiltering: config.escapeSequenceFiltering,
            resourceMonitoring: true,
            hangDetection: true
          }
        }
      },
      message: 'Claude instance launched successfully with enhanced PTY management',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to launch enhanced Claude instance', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/process-enhanced/kill
 * Kill Claude instance with cleanup
 */
router.post('/kill', async (req, res) => {
  try {
    console.log('[API] Killing enhanced Claude instance');
    
    await enhancedProcessManager.killInstance();
    
    res.json({
      success: true,
      message: 'Claude instance killed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Failed to kill enhanced Claude instance:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/process-enhanced/restart
 * Restart Claude instance with NLD monitoring
 */
router.post('/restart', async (req, res) => {
  try {
    console.log('[API] Restarting enhanced Claude instance');
    
    const processInfo = await enhancedProcessManager.restartInstance();
    
    res.json({
      success: true,
      data: processInfo,
      message: 'Claude instance restarted successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Failed to restart enhanced Claude instance:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/process-enhanced/input
 * Send input to Claude instance with I/O monitoring
 */
router.post('/input', async (req, res) => {
  try {
    const { input, instanceId } = req.body;
    
    if (typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Input must be a string',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!instanceId) {
      return res.status(400).json({
        success: false,
        error: 'Instance ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const success = await enhancedProcessManager.sendInput(instanceId, input);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found or not accepting input',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Input sent successfully',
      data: {
        instanceId,
        inputLength: input.length,
        monitoring: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to send input to enhanced Claude instance', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/process-enhanced/:instanceId/terminal/stream
 * Create SSE terminal output stream
 */
router.get('/:instanceId/terminal/stream', (req, res) => {
  try {
    const { instanceId } = req.params;
    
    logger.info(`Creating terminal SSE stream: ${instanceId}`);

    // Check if instance exists
    const processInfo = enhancedProcessManager.getInstanceInfo(instanceId);
    if (!processInfo) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found',
        instanceId,
        timestamp: new Date().toISOString()
      });
    }

    // Create SSE stream
    const connectionId = sseEventStreamer.createTerminalStream(instanceId, res);

    logger.info(`Terminal SSE stream created: ${instanceId}`, { connectionId });

  } catch (error) {
    logger.error(`Failed to create terminal stream for ${req.params.instanceId}`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * GET /api/process-enhanced/status/stream
 * Create SSE status stream
 */
router.get('/status/stream', (req, res) => {
  try {
    logger.info('Creating status SSE stream');

    const connectionId = sseEventStreamer.createStatusStream(res);
    logger.info('Status SSE stream created', { connectionId });

  } catch (error) {
    logger.error('Failed to create status stream', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * POST /api/process-enhanced/:instanceId/terminal/resize
 * Resize terminal for PTY processes
 */
router.post('/:instanceId/terminal/resize', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { cols, rows } = req.body;

    if (typeof cols !== 'number' || typeof rows !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'cols and rows must be numbers',
        timestamp: new Date().toISOString()
      });
    }

    const success = await enhancedProcessManager.resizeTerminal(instanceId, cols, rows);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found or resize not supported',
        instanceId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      cols,
      rows,
      instanceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to resize terminal for instance ${req.params.instanceId}`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/process-enhanced/:instanceId/output
 * Get incremental terminal output
 */
router.get('/:instanceId/output', (req, res) => {
  try {
    const { instanceId } = req.params;
    const fromPosition = parseInt(req.query.fromPosition as string) || 0;

    const { output, newPosition, totalLength } = enhancedProcessManager
      .getIncrementalOutput(instanceId, fromPosition);

    res.json({
      success: true,
      output,
      position: newPosition,
      totalLength,
      fromPosition,
      hasMore: newPosition < totalLength,
      filtered: EscapeSequenceFilter.containsProblematicSequences(output),
      instanceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to get output for instance ${req.params.instanceId}`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/process-enhanced/config
 * Update process configuration
 */
router.put('/config', (req, res) => {
  try {
    const config: Partial<ProcessConfig> = req.body;
    
    enhancedProcessManager.updateConfig(config);
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: enhancedProcessManager.getProcessInfo(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Failed to update enhanced ProcessManager config:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/process-enhanced/nld/health
 * Get comprehensive NLD health report
 */
router.get('/nld/health', (req, res) => {
  try {
    const globalHealthReport = nldProcessMonitor.generateHealthReport();
    const instanceHealthReport = enhancedProcessManager.getNLDHealthReport();
    
    res.json({
      success: true,
      data: {
        global: globalHealthReport,
        instance: instanceHealthReport
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/process-enhanced/nld/alerts
 * Get NLD alert history with filtering
 */
router.get('/nld/alerts', (req, res) => {
  try {
    const { pattern, severity, limit } = req.query;
    
    let alerts = nldProcessMonitor.getAlertHistory(
      pattern as ProcessFailurePattern
    );
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Limit results if specified
    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      alerts = alerts.slice(-limitNum); // Get most recent
    }
    
    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          patterns: [...new Set(alerts.map(a => a.pattern))],
          severities: [...new Set(alerts.map(a => a.severity))]
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/process-enhanced/nld/patterns
 * Get available failure patterns and their descriptions
 */
router.get('/nld/patterns', (req, res) => {
  try {
    const patterns = Object.values(ProcessFailurePattern).map(pattern => ({
      pattern,
      description: getPatternDescription(pattern),
      severity: getPatternSeverity(pattern),
      resolutionStrategy: getPatternResolution(pattern)
    }));
    
    res.json({
      success: true,
      data: { patterns },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/process-enhanced/nld/test-pattern
 * Trigger test pattern for development/testing
 */
router.post('/nld/test-pattern', (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!Object.values(ProcessFailurePattern).includes(pattern)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pattern specified',
        timestamp: new Date().toISOString()
      });
    }
    
    // Emit test alert
    nldProcessMonitor.emit('nld:alert', {
      pattern,
      instanceId: 'test-instance',
      severity: 'low',
      context: {
        testTriggered: true,
        triggeredAt: new Date().toISOString()
      },
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Test pattern triggered successfully',
      data: { pattern },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper functions for pattern information
 */
function getPatternDescription(pattern: ProcessFailurePattern): string {
  const descriptions = {
    [ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1]: 'Claude binary not found or spawn errors',
    [ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1]: 'Process state doesn\'t match actual process status',
    [ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1]: 'Stdin/stdout forwarding failures',
    [ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1]: 'Uncleaned processes or file descriptors',
    [ProcessFailurePattern.MULTI_PROCESS_RACE_CONDITION_V1]: 'Concurrent process management issues'
  };
  return descriptions[pattern] || 'Unknown pattern';
}

function getPatternSeverity(pattern: ProcessFailurePattern): string {
  const severities = {
    [ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1]: 'critical',
    [ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1]: 'high',
    [ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1]: 'medium',
    [ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1]: 'medium',
    [ProcessFailurePattern.MULTI_PROCESS_RACE_CONDITION_V1]: 'high'
  };
  return severities[pattern] || 'medium';
}

function getPatternResolution(pattern: ProcessFailurePattern): string {
  const resolutions = {
    [ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1]: 'Check Claude binary in PATH, verify working directory permissions',
    [ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1]: 'Refresh process registry, validate PID status',
    [ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1]: 'Reconnect I/O pipes, check for buffer overflow',
    [ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1]: 'Close unused file descriptors, monitor resource usage',
    [ProcessFailurePattern.MULTI_PROCESS_RACE_CONDITION_V1]: 'Implement process locking, serialize spawn operations'
  };
  return resolutions[pattern] || 'Manual investigation required';
}

// Error handling middleware for this router
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ProcessManagerEnhanced API Error]:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error in ProcessManagerEnhanced API',
    details: error.message,
    timestamp: new Date().toISOString()
  });
});

export default router;
