import express, { Request, Response } from 'express';

const router = express.Router();

// Mock data for dual instance activities
const mockActivities = [
  {
    id: 'act-1',
    agentName: 'Chief of Staff',
    instance: 'production',
    type: 'delegation',
    description: 'Delegated strategic planning task',
    timestamp: new Date()
  },
  {
    id: 'act-2',
    agentName: 'Code Generator',
    instance: 'development',
    type: 'code_generation',
    description: 'Generated new API endpoint',
    timestamp: new Date()
  }
];

// Get activities for dual instance view
router.get('/activities', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  
  res.json({
    success: true,
    activities: mockActivities.slice(0, limit),
    timestamp: new Date().toISOString()
  });
});

// Get handoff status
router.get('/handoff/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    handoffs: [],
    timestamp: new Date().toISOString()
  });
});

// Create a handoff
router.post('/handoff', (req: Request, res: Response) => {
  const { fromInstance, toInstance, type, description } = req.body;
  
  res.json({
    success: true,
    handoff: {
      id: `handoff-${Date.now()}`,
      fromInstance,
      toInstance,
      type,
      description,
      status: 'pending',
      timestamp: new Date()
    }
  });
});

export default router;