/**
 * Enhanced ProcessManager API Routes with NLD Integration
 * RESTful endpoints for process management with real-time failure pattern detection
 */

import express from 'express';
import { enhancedProcessManager } from '../services/EnhancedProcessManager';
import { nldProcessMonitor, ProcessFailurePattern } from '../services/NLDProcessHealthMonitor';
import { ProcessConfig } from '../services/ProcessManager';

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
 * Launch Claude instance with NLD monitoring
 */
router.post('/launch', async (req, res) => {
  try {
    const config: Partial<ProcessConfig> = req.body.config || {};
    
    // Validate configuration
    if (config.workingDirectory && !config.workingDirectory.startsWith('/workspaces/agent-feed')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid working directory. Must be within /workspaces/agent-feed',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[API] Launching enhanced Claude instance with config:', config);
    
    const processInfo = await enhancedProcessManager.launchInstance(config);
    
    res.json({
      success: true,
      data: {
        process: processInfo,
        nld: {
          monitoring: true,
          instanceId: enhancedProcessManager['instanceId']
        }
      },
      message: 'Claude instance launched successfully with NLD monitoring',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Failed to launch enhanced Claude instance:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      nld: {
        patternDetected: error.message.includes('ENOENT') ? ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1 : null
      },
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
router.post('/input', (req, res) => {
  try {
    const { input } = req.body;
    
    if (typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Input must be a string',
        timestamp: new Date().toISOString()
      });
    }
    
    enhancedProcessManager.sendInput(input);
    
    res.json({
      success: true,
      message: 'Input sent successfully',
      data: {
        inputLength: input.length,
        monitoring: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Failed to send input to enhanced Claude instance:', error.message);
    
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
