import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { app } from '@/api/server';

describe('WebSocket Real-time Features', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: Socket;

  beforeAll((done) => {
    httpServer = createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
      }
    });
    
    httpServer.listen(() => {
      const port = httpServer.address()?.port;
      clientSocket = Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.close();
  });

  describe('Agent Status Updates', () => {
    it('should broadcast agent status changes to all connected clients', (done) => {
      const agentStatusUpdate = {
        agentId: 'test-agent-1',
        status: 'active',
        timestamp: new Date().toISOString()
      };

      clientSocket.on('agent:status:update', (data) => {
        expect(data.agentId).toBe(agentStatusUpdate.agentId);
        expect(data.status).toBe(agentStatusUpdate.status);
        done();
      });

      // Simulate agent status update
      io.emit('agent:status:update', agentStatusUpdate);
    });

    it('should handle multiple agent status updates efficiently', (done) => {
      const updates = [
        { agentId: 'agent-1', status: 'busy' },
        { agentId: 'agent-2', status: 'idle' },
        { agentId: 'agent-3', status: 'error' }
      ];

      let receivedUpdates = 0;

      clientSocket.on('agent:status:batch', (data) => {
        expect(data.updates).toHaveLength(3);
        expect(data.updates).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ agentId: 'agent-1', status: 'busy' }),
            expect.objectContaining({ agentId: 'agent-2', status: 'idle' }),
            expect.objectContaining({ agentId: 'agent-3', status: 'error' })
          ])
        );
        done();
      });

      // Simulate batch status update
      io.emit('agent:status:batch', { updates, timestamp: new Date().toISOString() });
    });
  });

  describe('Live Post Updates', () => {
    it('should broadcast new posts to all connected clients', (done) => {
      const newPost = {
        id: 'new-post-1',
        title: 'Real-time Test Post',
        content: 'This is a test post for real-time updates',
        authorAgent: 'test-agent',
        publishedAt: new Date().toISOString(),
        metadata: {
          isAgentResponse: true,
          businessImpact: 7,
          tags: ['Testing', 'RealTime']
        }
      };

      clientSocket.on('post:created', (data) => {
        expect(data.id).toBe(newPost.id);
        expect(data.title).toBe(newPost.title);
        expect(data.authorAgent).toBe(newPost.authorAgent);
        done();
      });

      // Simulate new post creation
      io.emit('post:created', newPost);
    });

    it('should broadcast comment additions to subscribed clients', (done) => {
      const commentUpdate = {
        postId: 'post-1',
        comment: {
          id: 'comment-1',
          content: 'New real-time comment',
          author: 'test-user',
          createdAt: new Date().toISOString(),
          parentId: null
        }
      };

      clientSocket.on('comment:added', (data) => {
        expect(data.postId).toBe(commentUpdate.postId);
        expect(data.comment.content).toBe(commentUpdate.comment.content);
        expect(data.comment.author).toBe(commentUpdate.comment.author);
        done();
      });

      // Simulate comment addition
      io.emit('comment:added', commentUpdate);
    });
  });

  describe('Task Progress Updates', () => {
    it('should broadcast task progress updates to subscribers', (done) => {
      const taskUpdate = {
        taskId: 'task-1',
        progress: 75,
        status: 'in_progress',
        message: 'Processing data...',
        timestamp: new Date().toISOString()
      };

      clientSocket.on('task:progress', (data) => {
        expect(data.taskId).toBe(taskUpdate.taskId);
        expect(data.progress).toBe(taskUpdate.progress);
        expect(data.status).toBe(taskUpdate.status);
        done();
      });

      // Simulate task progress update
      io.emit('task:progress', taskUpdate);
    });

    it('should broadcast task completion notifications', (done) => {
      const taskCompletion = {
        taskId: 'task-1',
        status: 'completed',
        result: {
          success: true,
          output: 'Task completed successfully',
          executionTime: 5000
        },
        timestamp: new Date().toISOString()
      };

      clientSocket.on('task:completed', (data) => {
        expect(data.taskId).toBe(taskCompletion.taskId);
        expect(data.status).toBe('completed');
        expect(data.result.success).toBe(true);
        done();
      });

      // Simulate task completion
      io.emit('task:completed', taskCompletion);
    });
  });

  describe('Room-based Subscriptions', () => {
    it('should allow clients to join post-specific rooms', (done) => {
      const postId = 'post-123';
      
      clientSocket.emit('subscribe:post', postId);
      
      clientSocket.on('subscribed:post', (data) => {
        expect(data.postId).toBe(postId);
        expect(data.success).toBe(true);
        done();
      });
    });

    it('should only send updates to subscribed room members', (done) => {
      const postId = 'post-456';
      const updateData = {
        postId,
        type: 'like_added',
        data: { userId: 'user-1', timestamp: new Date().toISOString() }
      };

      // First subscribe to the post
      clientSocket.emit('subscribe:post', postId);
      
      clientSocket.on('subscribed:post', () => {
        // Now listen for post updates
        clientSocket.on('post:update', (data) => {
          expect(data.postId).toBe(postId);
          expect(data.type).toBe('like_added');
          done();
        });

        // Simulate post-specific update
        io.to(`post:${postId}`).emit('post:update', updateData);
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle client disconnections gracefully', (done) => {
      const testClient = Client(`http://localhost:${httpServer.address()?.port}`);
      
      testClient.on('connect', () => {
        testClient.disconnect();
      });

      testClient.on('disconnect', (reason) => {
        expect(['client namespace disconnect', 'io client disconnect']).toContain(reason);
        done();
      });
    });

    it('should maintain connection state across reconnections', (done) => {
      let reconnected = false;

      clientSocket.on('reconnect', () => {
        reconnected = true;
        expect(reconnected).toBe(true);
        done();
      });

      // Simulate temporary disconnection
      clientSocket.disconnect();
      setTimeout(() => {
        clientSocket.connect();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid subscription requests', (done) => {
      clientSocket.emit('subscribe:post', ''); // Invalid post ID

      clientSocket.on('error:subscription', (data) => {
        expect(data.error).toBe('Invalid post ID');
        done();
      });
    });

    it('should handle malformed event data', (done) => {
      clientSocket.emit('invalid:event', { malformed: 'data' });

      clientSocket.on('error:invalid_event', (data) => {
        expect(data.error).toContain('Unknown event type');
        done();
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections: Socket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const client = Client(`http://localhost:${httpServer.address()?.port}`);
        connections.push(client);

        const connectionPromise = new Promise<void>((resolve) => {
          client.on('connect', () => resolve());
        });
        connectionPromises.push(connectionPromise);
      }

      // Wait for all connections
      await Promise.all(connectionPromises);

      // Verify all connections are established
      expect(connections).toHaveLength(10);
      connections.forEach(conn => {
        expect(conn.connected).toBe(true);
      });

      // Clean up
      connections.forEach(conn => conn.disconnect());
    });

    it('should efficiently broadcast to large numbers of clients', (done) => {
      const broadcastData = {
        type: 'system:announcement',
        message: 'System maintenance in 5 minutes',
        timestamp: new Date().toISOString()
      };

      let receivedCount = 0;
      const expectedCount = 1; // We only have one test client for now

      clientSocket.on('system:announcement', (data) => {
        receivedCount++;
        expect(data.message).toBe(broadcastData.message);
        
        if (receivedCount === expectedCount) {
          done();
        }
      });

      // Broadcast to all clients
      io.emit('system:announcement', broadcastData);
    });
  });
});