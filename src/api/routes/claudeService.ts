/**
 * Claude Service API Routes - SPARC Completion Phase
 * 
 * REST API endpoints for ClaudeServiceManager integration with Feed
 * Provides job submission, status monitoring, and worker management
 */

import { Router, Request, Response } from 'express';
import { ClaudeServiceManager } from '../services/ClaudeServiceManager';
import winston from 'winston';

// Global service manager instance (singleton pattern)
let serviceManager: ClaudeServiceManager | null = null;

// Initialize service manager
const initializeServiceManager = async (): Promise<ClaudeServiceManager> => {
  if (!serviceManager) {
    serviceManager = new ClaudeServiceManager({
      prodDirectory: '/workspaces/agent-feed/prod',
      minWorkers: 2,
      maxWorkers: 8,
      healthCheckInterval: 30000,
      jobQueueLimit: 100
    });
    
    await serviceManager.initialize();
    console.log('✅ SPARC COMPLETION: ClaudeServiceManager initialized for API');
  }
  
  return serviceManager;
};

const router = Router();

/**
 * SPARC COMPLETION: Service status endpoint
 * GET /api/v1/service/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const status = manager.getServiceStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Service status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: Job submission endpoint
 * POST /api/v1/service/jobs
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const { type, priority, payload, routing } = req.body;
    
    // Validate required fields
    if (!type || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, priority'
      });
    }
    
    // Submit job to service manager
    const jobId = await manager.submitFeedJob({
      type,
      priority,
      payload: payload || {},
      routing: routing || {}
    });
    
    res.json({
      success: true,
      data: { jobId },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Job submission error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: Job status endpoint
 * GET /api/v1/service/jobs/:jobId
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const { jobId } = req.params;
    
    const jobStatus = manager.getJobStatus(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: jobStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Job status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: All jobs endpoint
 * GET /api/v1/service/jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const status = manager.getServiceStatus();
    
    // Return active and recent jobs (simplified - would need proper job history storage)
    const jobs = Array.from((manager as any).activeJobs.values()).map((job: any) => ({
      id: job.jobId,
      type: 'unknown', // Would need to store job type in activeJobs
      status: job.status,
      workerId: job.workerId,
      submissionTime: job.timing.accepted,
      completionTime: job.timing.completed,
      duration: job.timing.duration,
      error: job.error?.message
    }));
    
    res.json({
      success: true,
      data: jobs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Jobs list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: Worker management endpoint
 * GET /api/v1/service/workers
 */
router.get('/workers', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const status = manager.getServiceStatus();
    
    res.json({
      success: true,
      data: {
        workers: status.workers,
        queue: status.queue,
        health: status.health
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Workers status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: Worker designation endpoint
 * POST /api/v1/service/workers/:workerId/designate
 */
router.post('/workers/:workerId/designate', async (req: Request, res: Response) => {
  try {
    const manager = await initializeServiceManager();
    const { workerId } = req.params;
    const { capabilities } = req.body;
    
    if (!capabilities || !Array.isArray(capabilities)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid capabilities array'
      });
    }
    
    await manager.designateWorker(workerId, capabilities);
    
    res.json({
      success: true,
      data: { workerId, capabilities },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Worker designation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * SPARC COMPLETION: Service shutdown endpoint (for graceful deployment)
 * POST /api/v1/service/shutdown
 */
router.post('/shutdown', async (req: Request, res: Response) => {
  try {
    if (serviceManager) {
      await serviceManager.shutdown();
      serviceManager = null;
      
      res.json({
        success: true,
        message: 'Service manager shutdown completed',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'Service manager was not running',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Service shutdown error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('🔄 SPARC COMPLETION: Graceful shutdown initiated...');
  if (serviceManager) {
    try {
      await serviceManager.shutdown();
      console.log('✅ SPARC COMPLETION: Service manager shutdown completed');
    } catch (error) {
      console.error('❌ SPARC COMPLETION: Shutdown error:', error);
    }
  }
  process.exit(0);
});

export default router;

/**
 * SPARC COMPLETION: API Integration Summary
 * 
 * ✅ IMPLEMENTED ENDPOINTS:
 * - GET /api/v1/service/status - Service and worker status
 * - POST /api/v1/service/jobs - Submit Feed jobs
 * - GET /api/v1/service/jobs/:jobId - Get job status
 * - GET /api/v1/service/jobs - List all jobs
 * - GET /api/v1/service/workers - Worker metrics
 * - POST /api/v1/service/workers/:workerId/designate - Designate workers
 * - POST /api/v1/service/shutdown - Graceful shutdown
 * 
 * 🔄 INTEGRATION POINTS:
 * - ClaudeServiceManager singleton initialization
 * - Error handling and validation
 * - JSON response formatting
 * - Graceful shutdown handling
 */