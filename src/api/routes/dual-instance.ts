import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';

const router = express.Router();

// Proxy configuration for dual instances
const devProxyOptions = {
  target: 'http://localhost:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/api/dev': ''
  },
  onError: (err: any, req: any, res: any) => {
    console.error('Development proxy error:', err);
    res.status(503).json({ error: 'Development instance unavailable' });
  }
};

const prodProxyOptions = {
  target: 'http://localhost:8090',
  changeOrigin: true,
  pathRewrite: {
    '^/api/prod': ''
  },
  onError: (err: any, req: any, res: any) => {
    console.error('Production proxy error:', err);
    res.status(503).json({ error: 'Production instance unavailable' });
  }
};

// Create proxy middleware
const devProxy = createProxyMiddleware(devProxyOptions);
const prodProxy = createProxyMiddleware(prodProxyOptions);

// Route all development requests
router.use('/dev/*', devProxy);

// Route all production requests
router.use('/prod/*', prodProxy);

// Handoff coordination endpoint
router.post('/handoff/create', async (req, res) => {
  const { fromInstance, toInstance, type, description, payload } = req.body;
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const result = await pool.query(`
      INSERT INTO public.instance_coordination 
      (source_instance, target_instance, handoff_type, payload, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, created_at
    `, [fromInstance, toInstance, type, JSON.stringify({ description, ...payload })]);

    res.json({
      success: true,
      handoff: {
        id: result.rows[0].id,
        fromInstance,
        toInstance,
        type,
        description,
        status: 'pending',
        timestamp: result.rows[0].created_at
      }
    });

    await pool.end();
  } catch (error) {
    console.error('Failed to create handoff:', error);
    res.status(500).json({ error: 'Failed to create handoff' });
  }
});

// Get handoff status
router.get('/handoff/status', async (req, res) => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const result = await pool.query(`
      SELECT 
        id,
        source_instance as "fromInstance",
        target_instance as "toInstance",
        handoff_type as type,
        payload,
        status,
        created_at as timestamp,
        processed_at
      FROM public.instance_coordination
      WHERE status != 'completed'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const handoffs = result.rows.map(row => ({
      id: row.id,
      fromInstance: row.fromInstance,
      toInstance: row.toInstance,
      type: row.type,
      description: row.payload?.description || 'No description',
      status: row.status,
      timestamp: row.timestamp,
      processedAt: row.processed_at
    }));

    res.json({ handoffs });
    await pool.end();
  } catch (error) {
    console.error('Failed to fetch handoffs:', error);
    res.status(500).json({ error: 'Failed to fetch handoffs' });
  }
});

// Process handoff
router.post('/handoff/:handoffId/process', async (req, res) => {
  const { handoffId } = req.params;
  const { action, result } = req.body;
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    await pool.query(`
      UPDATE public.instance_coordination 
      SET 
        status = $1,
        processed_at = NOW(),
        payload = payload || $2
      WHERE id = $3
    `, [action === 'complete' ? 'completed' : 'failed', JSON.stringify({ result }), handoffId]);

    res.json({ success: true });
    await pool.end();
  } catch (error) {
    console.error('Failed to process handoff:', error);
    res.status(500).json({ error: 'Failed to process handoff' });
  }
});

// Health check for both instances
router.get('/health', async (req, res) => {
  const healthChecks = {
    development: {
      status: 'unknown',
      port: 8080,
      agents: 0,
      lastCheck: new Date()
    },
    production: {
      status: 'unknown',
      port: 8090,
      agents: 0,
      lastCheck: new Date()
    }
  };

  // Check development instance
  try {
    const devResponse = await fetch('http://localhost:8080/health', { 
      signal: AbortSignal.timeout(3000) 
    });
    healthChecks.development.status = devResponse.ok ? 'healthy' : 'unhealthy';
    
    if (devResponse.ok) {
      const devAgents = await fetch('http://localhost:8080/agents').then(r => r.json());
      healthChecks.development.agents = devAgents.agents?.length || 0;
    }
  } catch (error) {
    healthChecks.development.status = 'down';
  }

  // Check production instance
  try {
    const prodResponse = await fetch('http://localhost:8090/health', { 
      signal: AbortSignal.timeout(3000) 
    });
    healthChecks.production.status = prodResponse.ok ? 'healthy' : 'unhealthy';
    
    if (prodResponse.ok) {
      const prodAgents = await fetch('http://localhost:8090/agents').then(r => r.json());
      healthChecks.production.agents = prodAgents.agents?.length || 0;
    }
  } catch (error) {
    healthChecks.production.status = 'down';
  }

  const overallStatus = 
    healthChecks.development.status === 'healthy' && healthChecks.production.status === 'healthy' 
      ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    instances: healthChecks,
    timestamp: new Date()
  });
});

// Get activities from both instances
router.get('/activities', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // Fetch from both schemas
    const result = await pool.query(`
      (
        SELECT 
          'development' as instance,
          agent_name,
          activity_type,
          description,
          metadata,
          created_at
        FROM development.agent_activities
        ORDER BY created_at DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 
          'production' as instance,
          agent_name,
          activity_type,
          description,
          metadata,
          created_at
        FROM production.agent_activities
        ORDER BY created_at DESC
        LIMIT $1
      )
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    const activities = result.rows.map(row => ({
      id: `${row.instance}-${row.agent_name}-${row.created_at.getTime()}`,
      agentName: row.agent_name,
      instance: row.instance,
      type: row.activity_type,
      description: row.description,
      timestamp: row.created_at,
      metadata: row.metadata
    }));

    res.json({ activities });
    await pool.end();
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// WebSocket setup for real-time updates
export const setupDualInstanceWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server, path: '/ws/dual-instance' });
  
  wss.on('connection', (ws) => {
    console.log('Dual instance WebSocket client connected');
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected', timestamp: new Date() }
    }));
    
    // Setup periodic updates
    const updateInterval = setInterval(async () => {
      try {
        // Fetch recent activities
        const activitiesResponse = await fetch('http://localhost:3000/api/dual-instance/activities?limit=10');
        const activities = await activitiesResponse.json();
        
        // Fetch handoffs
        const handoffsResponse = await fetch('http://localhost:3000/api/dual-instance/handoff/status');
        const handoffs = await handoffsResponse.json();
        
        ws.send(JSON.stringify({
          type: 'update',
          data: {
            activities: activities.activities || [],
            handoffs: handoffs.handoffs || [],
            timestamp: new Date()
          }
        }));
      } catch (error) {
        console.error('WebSocket update error:', error);
      }
    }, 5000);
    
    ws.on('close', () => {
      clearInterval(updateInterval);
      console.log('Dual instance WebSocket client disconnected');
    });
  });
  
  return wss;
};

export default router;