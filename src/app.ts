import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { DatabaseService } from './database/DatabaseService.js';
import { postsRouter } from './api/routes/posts.js';
import { agentsRouter } from './api/routes/agents.js';

export async function createApp(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API Health check
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      const dbService = new DatabaseService();
      await dbService.connect();
      const isConnected = await dbService.isConnected();
      await dbService.disconnect();

      res.json({
        status: 'healthy',
        database: isConnected ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API Routes
  app.use('/api/posts', postsRouter);
  app.use('/api/agents', agentsRouter);

  // Feed endpoint
  app.get('/api/feed', async (req: Request, res: Response) => {
    try {
      const dbService = new DatabaseService();
      await dbService.connect();
      
      const posts = await dbService.getAllPosts();
      
      await dbService.disconnect();

      res.json({
        posts,
        totalCount: posts.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });

  // Error handler
  app.use((error: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}