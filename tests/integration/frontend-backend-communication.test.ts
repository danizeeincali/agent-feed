import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { DatabaseService } from '../../src/database/DatabaseService';
import { Server } from 'http';
import WebSocket from 'ws';

describe('Frontend-Backend Communication Tests', () => {
  let app: Express;
  let server: Server;
  let dbService: DatabaseService;
  let wsServer: WebSocket.Server;

  beforeAll(async () => {
    // Initialize database
    dbService = new DatabaseService();
    await dbService.connect();
    await dbService.initializeSchema();
    
    // Create app and start server
    app = await createApp();
    server = app.listen(0); // Use random port
    
    const address = server.address();
    const port = typeof address === 'object' ? address?.port : 3001;
    
    // Setup WebSocket server for real-time communication tests
    wsServer = new WebSocket.Server({ port: port + 1 });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (wsServer) {
      wsServer.close();
    }
    if (dbService) {
      await dbService.disconnect();
    }
  });

  describe('REST API Communication', () => {
    it('should handle CORS for frontend requests', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should handle preflight OPTIONS requests', async () => {
      await request(app)
        .options('/api/posts')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);
    });

    it('should return JSON responses with correct content type', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle POST requests from frontend', async () => {
      const newPost = {
        title: 'Frontend Test Post',
        content: 'Content from frontend',
        author: 'frontend-test',
        hashtags: ['frontend', 'test']
      };

      const response = await request(app)
        .post('/api/posts')
        .send(newPost)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newPost.title);
    });

    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/api/posts?limit=5&offset=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Agent API Communication', () => {
    it('should retrieve agent list for frontend', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
      }
    });

    it('should handle agent detail requests', async () => {
      const agentsResponse = await request(app)
        .get('/api/agents')
        .expect(200);

      if (agentsResponse.body.length > 0) {
        const agentId = agentsResponse.body[0].id;
        
        const response = await request(app)
          .get(`/api/agents/${agentId}`)
          .expect(200);

        expect(response.body.id).toBe(agentId);
      }
    });

    it('should handle agent status updates', async () => {
      const statusUpdate = {
        status: 'active',
        lastSeen: new Date().toISOString()
      };

      await request(app)
        .put('/api/agents/test-agent/status')
        .send(statusUpdate)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Real-time Communication', () => {
    it('should support WebSocket connections', (done) => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : 3001;
      
      const ws = new WebSocket(`ws://localhost:${port + 1}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message).toHaveProperty('type');
        ws.close();
        done();
      });
      
      ws.on('error', (error) => {
        done(error);
      });
      
      // Setup timeout
      setTimeout(() => {
        ws.close();
        done(new Error('WebSocket connection timeout'));
      }, 5000);
    });

    it('should broadcast updates to connected clients', (done) => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : 3001;
      
      const ws1 = new WebSocket(`ws://localhost:${port + 1}`);
      const ws2 = new WebSocket(`ws://localhost:${port + 1}`);
      
      let receivedCount = 0;
      const expectedMessage = { type: 'post_update', data: { id: 'test' } };
      
      const handleMessage = (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'post_update') {
          receivedCount++;
          if (receivedCount === 2) {
            ws1.close();
            ws2.close();
            done();
          }
        }
      };
      
      ws1.on('message', handleMessage);
      ws2.on('message', handleMessage);
      
      Promise.all([
        new Promise(resolve => ws1.on('open', resolve)),
        new Promise(resolve => ws2.on('open', resolve))
      ]).then(() => {
        // Simulate broadcast
        wsServer.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(expectedMessage));
          }
        });
      });
      
      // Timeout
      setTimeout(() => {
        ws1.close();
        ws2.close();
        done(new Error('Broadcast test timeout'));
      }, 5000);
    });
  });

  describe('Error Handling', () => {
    it('should return appropriate error codes for invalid requests', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/posts')
        .type('json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should validate required fields', async () => {
      const incompletePost = {
        title: 'Incomplete Post'
        // Missing required fields
      };

      await request(app)
        .post('/api/posts')
        .send(incompletePost)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle database errors gracefully', async () => {
      // Disconnect database to simulate error
      await dbService.disconnect();
      
      const response = await request(app)
        .get('/api/posts')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      
      // Reconnect for cleanup
      await dbService.connect();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app).get('/api/posts')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/posts')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle large payloads', async () => {
      const largePost = {
        title: 'Large Post',
        content: 'x'.repeat(50000), // 50KB content
        author: 'load-test',
        hashtags: Array(100).fill('tag').map((tag, i) => `${tag}${i}`)
      };

      await request(app)
        .post('/api/posts')
        .send(largePost)
        .expect((res) => {
          expect([201, 413]).toContain(res.status); // Created or Payload Too Large
        });
    });
  });
});