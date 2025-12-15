/**
 * ProcessManager API Routes
 * 
 * Express routes for Claude instance management
 */

import { Router, Request, Response } from 'express';
import { processManager } from '../../services/ProcessManager';

const router = Router();

// Get current process info
router.get('/info', (req: Request, res: Response) => {
  try {
    const info = processManager.getProcessInfo();
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Launch new instance
router.post('/launch', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const info = await processManager.launchInstance(config);
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Kill current instance
router.post('/kill', async (req: Request, res: Response) => {
  try {
    await processManager.killInstance();
    res.json({ success: true, message: 'Instance killed' });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Restart instance
router.post('/restart', async (req: Request, res: Response) => {
  try {
    const info = await processManager.restartInstance();
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update configuration
router.put('/config', (req: Request, res: Response) => {
  try {
    const config = req.body;
    processManager.updateConfig(config);
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;