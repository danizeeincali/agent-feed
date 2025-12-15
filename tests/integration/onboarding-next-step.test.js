const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');

/**
 * TDD Test Suite for Issue 3: Next Step Post WebSocket Emission
 *
 * PROBLEM: Name submission doesn't emit WebSocket event for use case post
 * EXPECTED: After name submission, post:created event fires for next step
 *
 * Test Coverage:
 * - Name submission creates use case post
 * - WebSocket emits post:created event
 * - Post has correct onboarding metadata
 * - Frontend receives event and displays post
 * - No duplicate posts created
 * - Event contains complete post data
 */

describe('Issue 3: Next Step Post WebSocket Emission', () => {
  let app;
  let httpServer;
  let io;
  let clientSocket;
  let serverSocket;
  const TEST_PORT = 3001;

  beforeEach((done) => {
    // Create test server
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
      },
    });

    httpServer.listen(TEST_PORT, () => {
      // Create client socket
      clientSocket = Client(`http://localhost:${TEST_PORT}`);

      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket.on('connect', done);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Name Submission Flow', () => {
    it('should create use case post after name submission', async () => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'John Doe',
        onboardingStep: 'name',
      };

      // Mock the onboarding service call
      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('post');
      expect(response.body.post).toMatchObject({
        content: expect.stringContaining('use case'),
        onboarding_step: 'use_case_selection',
      });
    });

    it('should emit post:created WebSocket event after name submission', (done) => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'John Doe',
      };

      // Listen for WebSocket event
      clientSocket.on('post:created', (data) => {
        try {
          expect(data).toHaveProperty('post');
          expect(data.post).toMatchObject({
            content: expect.stringContaining('use case'),
            onboarding_step: 'use_case_selection',
          });
          done();
        } catch (error) {
          done(error);
        }
      });

      // Submit name (will trigger post creation and WebSocket emission)
      request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission)
        .end((err) => {
          if (err) done(err);
        });
    });

    it('should include complete post data in WebSocket event', (done) => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'Jane Smith',
      };

      clientSocket.on('post:created', (data) => {
        try {
          expect(data.post).toMatchObject({
            id: expect.any(Number),
            content: expect.any(String),
            author: expect.any(String),
            created_at: expect.any(String),
            onboarding_step: 'use_case_selection',
            metadata: expect.objectContaining({
              isOnboarding: true,
              step: 'use_case_selection',
            }),
          });
          done();
        } catch (error) {
          done(error);
        }
      });

      request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission)
        .end((err) => {
          if (err) done(err);
        });
    });
  });

  describe('Frontend Integration', () => {
    it('should allow frontend to receive and display new post', (done) => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'Test User',
      };

      let receivedPost = null;

      clientSocket.on('post:created', (data) => {
        receivedPost = data.post;
      });

      request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission)
        .end(() => {
          setTimeout(() => {
            try {
              expect(receivedPost).not.toBeNull();
              expect(receivedPost.content).toContain('use case');
              done();
            } catch (error) {
              done(error);
            }
          }, 100);
        });
    });

    it('should emit event to all connected clients', (done) => {
      // This test will FAIL until implementation
      const client2 = Client(`http://localhost:${TEST_PORT}`);
      let client1Received = false;
      let client2Received = false;

      const checkBothReceived = () => {
        if (client1Received && client2Received) {
          client2.disconnect();
          done();
        }
      };

      clientSocket.on('post:created', () => {
        client1Received = true;
        checkBothReceived();
      });

      client2.on('post:created', () => {
        client2Received = true;
        checkBothReceived();
      });

      client2.on('connect', () => {
        request(app)
          .post('/api/onboarding/submit-name')
          .send({ userId: 1, name: 'Test' })
          .end((err) => {
            if (err) done(err);
          });
      });
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not create duplicate posts on repeated name submissions', async () => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'Test User',
      };

      const response1 = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      const response2 = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      expect(response1.body.post.id).toBe(response2.body.post.id);
    });

    it('should not emit duplicate WebSocket events', (done) => {
      // This test will FAIL until implementation
      let eventCount = 0;

      clientSocket.on('post:created', () => {
        eventCount++;
      });

      const mockNameSubmission = {
        userId: 1,
        name: 'Test User',
      };

      request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission)
        .end(() => {
          // Try to submit again immediately
          request(app)
            .post('/api/onboarding/submit-name')
            .send(mockNameSubmission)
            .end(() => {
              setTimeout(() => {
                try {
                  expect(eventCount).toBe(1);
                  done();
                } catch (error) {
                  done(error);
                }
              }, 100);
            });
        });
    });
  });

  describe('Onboarding Metadata', () => {
    it('should include correct onboarding step in post', async () => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      expect(response.body.post).toMatchObject({
        onboarding_step: 'use_case_selection',
        metadata: expect.objectContaining({
          isOnboarding: true,
          step: 'use_case_selection',
          previousStep: 'name',
        }),
      });
    });

    it('should associate post with correct user', async () => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 123,
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      expect(response.body.post.author_user_id).toBe(123);
    });

    it('should mark post as system-generated', async () => {
      // This test will FAIL until implementation
      const mockNameSubmission = {
        userId: 1,
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send(mockNameSubmission);

      expect(response.body.post.metadata).toMatchObject({
        systemGenerated: true,
        trigger: 'onboarding_name_submission',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing name gracefully', async () => {
      // This test will FAIL until implementation
      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send({ userId: 1 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing userId gracefully', async () => {
      // This test will FAIL until implementation
      const response = await request(app)
        .post('/api/onboarding/submit-name')
        .send({ name: 'Test User' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should not emit WebSocket event on error', (done) => {
      // This test will FAIL until implementation
      let eventEmitted = false;

      clientSocket.on('post:created', () => {
        eventEmitted = true;
      });

      request(app)
        .post('/api/onboarding/submit-name')
        .send({ userId: 1 }) // Missing name
        .end(() => {
          setTimeout(() => {
            try {
              expect(eventEmitted).toBe(false);
              done();
            } catch (error) {
              done(error);
            }
          }, 100);
        });
    });
  });

  describe('Timing and Sequencing', () => {
    it('should emit WebSocket event immediately after post creation', (done) => {
      // This test will FAIL until implementation
      const startTime = Date.now();

      clientSocket.on('post:created', () => {
        const elapsed = Date.now() - startTime;
        try {
          expect(elapsed).toBeLessThan(100); // Within 100ms
          done();
        } catch (error) {
          done(error);
        }
      });

      request(app)
        .post('/api/onboarding/submit-name')
        .send({ userId: 1, name: 'Test User' })
        .end((err) => {
          if (err) done(err);
        });
    });

    it('should emit event before HTTP response completes', (done) => {
      // This test will FAIL until implementation
      let eventReceived = false;

      clientSocket.on('post:created', () => {
        eventReceived = true;
      });

      request(app)
        .post('/api/onboarding/submit-name')
        .send({ userId: 1, name: 'Test User' })
        .end(() => {
          try {
            expect(eventReceived).toBe(true);
            done();
          } catch (error) {
            done(error);
          }
        });
    });
  });
});
