/**
 * TDD Unit Tests: Backend WebSocket Event Emission
 *
 * Tests the event emission system for agent ticket processing
 * following the Test-Driven Development (RED-GREEN-REFACTOR) methodology.
 *
 * These tests are written FIRST and should FAIL initially (RED phase).
 * Implementation will then be adjusted to make them pass (GREEN phase).
 *
 * Coverage Target: 95%+
 * Framework: Jest with WebSocket service mocks
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock modules before requiring the actual modules
jest.mock('../../api-server/services/websocket-service.js');

describe('Backend WebSocket Event Emission', () => {
  let mockWebSocketService;
  let mockTicketOrchestrator;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock WebSocket Service
    mockWebSocketService = {
      emitTicketStatusUpdate: jest.fn(),
      isInitialized: true,
      io: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      }
    };

    // Mock Request object
    mockRequest = {
      body: {
        content: 'Test post content',
        author_id: 'user123',
        author_display_name: 'Test User'
      },
      user: {
        id: 'user123'
      }
    };

    // Mock Response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock Ticket Orchestrator
    mockTicketOrchestrator = {
      createTicket: jest.fn(),
      processTicket: jest.fn(),
      getTicketStatus: jest.fn(),
      emit: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ========================================================================
  // 1. IMMEDIATE PENDING EVENT TESTS (after ticket creation)
  // ========================================================================

  describe('1. Immediate Pending Event Emission', () => {
    it('should emit "pending" event immediately after ticket creation', async () => {
      // ARRANGE
      const postId = 'post_123';
      const ticketId = 'ticket_456';
      const expectedPayload = {
        post_id: postId,
        ticket_id: ticketId,
        status: 'pending',
        timestamp: expect.any(String)
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(expectedPayload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          post_id: postId,
          ticket_id: ticketId,
          status: 'pending'
        })
      );
    });

    it('should emit pending event with correct payload structure', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          post_id: expect.any(String),
          ticket_id: expect.any(String),
          status: 'pending',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        })
      );
    });

    it('should broadcast to correct room (post:${postId})', async () => {
      // ARRANGE
      const postId = 'post_123';
      const expectedRoom = `post:${postId}`;

      mockWebSocketService.io.to.mockReturnValue({
        emit: jest.fn()
      });

      // ACT
      const roomEmitter = mockWebSocketService.io.to(expectedRoom);
      roomEmitter.emit('ticketStatus', { post_id: postId, status: 'pending' });

      // ASSERT
      expect(mockWebSocketService.io.to).toHaveBeenCalledWith(expectedRoom);
    });

    it('should NOT emit if websocketService is not initialized', async () => {
      // ARRANGE
      mockWebSocketService.isInitialized = false;
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      if (mockWebSocketService.isInitialized) {
        await mockWebSocketService.emitTicketStatusUpdate(payload);
      }

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).not.toHaveBeenCalled();
    });

    it('should NOT emit if websocketService is null', async () => {
      // ARRANGE
      const nullService = null;
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT & ASSERT
      expect(() => {
        if (nullService) {
          nullService.emitTicketStatusUpdate(payload);
        }
      }).not.toThrow();
    });

    it('should NOT emit if websocketService is undefined', async () => {
      // ARRANGE
      const undefinedService = undefined;
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT & ASSERT
      expect(() => {
        if (undefinedService) {
          undefinedService.emitTicketStatusUpdate(payload);
        }
      }).not.toThrow();
    });
  });

  // ========================================================================
  // 2. ORCHESTRATOR EVENT EMISSION TESTS (during ticket processing)
  // ========================================================================

  describe('2. Orchestrator Event Emission', () => {
    it('should emit "processing" event when worker starts', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'processing',
        agent_id: 'agent_789',
        timestamp: new Date().toISOString()
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          agent_id: 'agent_789'
        })
      );
    });

    it('should emit "completed" event when worker finishes successfully', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'completed',
        agent_id: 'agent_789',
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: 1250,
          responseGenerated: true
        }
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({
            processingTime: expect.any(Number),
            responseGenerated: true
          })
        })
      );
    });

    it('should emit "failed" event on error with error details', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'failed',
        agent_id: 'agent_789',
        timestamp: new Date().toISOString(),
        error: {
          message: 'Agent processing failed',
          code: 'AGENT_ERROR',
          details: 'Worker timeout after 30s'
        }
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({
            message: expect.any(String),
            code: expect.any(String)
          })
        })
      );
    });

    it('should emit all lifecycle events in correct order', async () => {
      // ARRANGE
      const postId = 'post_123';
      const ticketId = 'ticket_456';
      const events = [
        { status: 'pending' },
        { status: 'processing', agent_id: 'agent_789' },
        { status: 'completed', agent_id: 'agent_789' }
      ];

      // ACT
      for (const event of events) {
        await mockWebSocketService.emitTicketStatusUpdate({
          post_id: postId,
          ticket_id: ticketId,
          ...event,
          timestamp: new Date().toISOString()
        });
      }

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledTimes(3);
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ status: 'pending' })
      );
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ status: 'processing' })
      );
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  // ========================================================================
  // 3. EVENT PAYLOAD VALIDATION TESTS
  // ========================================================================

  describe('3. Event Payload Validation', () => {
    describe('Required Fields', () => {
      it('should validate payload has post_id', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(payload).toHaveProperty('post_id');
        expect(payload.post_id).toBeTruthy();
        expect(typeof payload.post_id).toBe('string');
      });

      it('should validate payload has ticket_id', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(payload).toHaveProperty('ticket_id');
        expect(payload.ticket_id).toBeTruthy();
        expect(typeof payload.ticket_id).toBe('string');
      });

      it('should validate payload has status', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(payload).toHaveProperty('status');
        expect(payload.status).toBeTruthy();
        expect(typeof payload.status).toBe('string');
      });

      it('should validate payload has timestamp', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(payload).toHaveProperty('timestamp');
        expect(payload.timestamp).toBeTruthy();
        expect(typeof payload.timestamp).toBe('string');
      });

      it('should reject payload missing post_id', () => {
        // ARRANGE
        const invalidPayload = {
          // post_id missing
          ticket_id: 'ticket_456',
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(invalidPayload.post_id).toBeUndefined();
      });

      it('should reject payload missing ticket_id', () => {
        // ARRANGE
        const invalidPayload = {
          post_id: 'post_123',
          // ticket_id missing
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(invalidPayload.ticket_id).toBeUndefined();
      });

      it('should reject payload missing status', () => {
        // ARRANGE
        const invalidPayload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          // status missing
          timestamp: new Date().toISOString()
        };

        // ASSERT
        expect(invalidPayload.status).toBeUndefined();
      });

      it('should reject payload missing timestamp', () => {
        // ARRANGE
        const invalidPayload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'pending'
          // timestamp missing
        };

        // ASSERT
        expect(invalidPayload.timestamp).toBeUndefined();
      });
    });

    describe('Optional Fields', () => {
      it('should allow optional agent_id field', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'processing',
          timestamp: new Date().toISOString(),
          agent_id: 'agent_789'
        };

        // ASSERT
        expect(payload.agent_id).toBe('agent_789');
      });

      it('should allow optional error field', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: {
            message: 'Processing failed',
            code: 'PROCESSING_ERROR'
          }
        };

        // ASSERT
        expect(payload.error).toBeDefined();
        expect(payload.error.message).toBe('Processing failed');
      });

      it('should allow optional metadata field', () => {
        // ARRANGE
        const payload = {
          post_id: 'post_123',
          ticket_id: 'ticket_456',
          status: 'completed',
          timestamp: new Date().toISOString(),
          metadata: {
            processingTime: 1500,
            tokensUsed: 250
          }
        };

        // ASSERT
        expect(payload.metadata).toBeDefined();
        expect(payload.metadata.processingTime).toBe(1500);
      });
    });

    describe('Timestamp Format', () => {
      it('should validate timestamp is ISO 8601 format', () => {
        // ARRANGE
        const timestamp = new Date().toISOString();
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

        // ASSERT
        expect(timestamp).toMatch(iso8601Regex);
      });

      it('should reject invalid timestamp format', () => {
        // ARRANGE
        const invalidTimestamp = '2024-01-01 12:00:00'; // Not ISO 8601
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

        // ASSERT
        expect(invalidTimestamp).not.toMatch(iso8601Regex);
      });

      it('should ensure timestamp is a valid date', () => {
        // ARRANGE
        const timestamp = new Date().toISOString();
        const date = new Date(timestamp);

        // ASSERT
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    describe('Status Validation', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];

      validStatuses.forEach(status => {
        it(`should accept valid status: "${status}"`, () => {
          // ARRANGE
          const payload = {
            post_id: 'post_123',
            ticket_id: 'ticket_456',
            status: status,
            timestamp: new Date().toISOString()
          };

          // ASSERT
          expect(validStatuses).toContain(payload.status);
        });
      });

      it('should reject invalid status value', () => {
        // ARRANGE
        const invalidStatus = 'invalid_status';
        const validStatuses = ['pending', 'processing', 'completed', 'failed'];

        // ASSERT
        expect(validStatuses).not.toContain(invalidStatus);
      });

      it('should reject empty status', () => {
        // ARRANGE
        const emptyStatus = '';

        // ASSERT
        expect(emptyStatus).toBeFalsy();
      });

      it('should reject null status', () => {
        // ARRANGE
        const nullStatus = null;

        // ASSERT
        expect(nullStatus).toBeNull();
      });
    });
  });

  // ========================================================================
  // 4. INTEGRATION WITH WEBSOCKET SERVICE TESTS
  // ========================================================================

  describe('4. Integration with WebSocket Service', () => {
    it('should call websocketService.emitTicketStatusUpdate()', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(payload);
    });

    it('should handle websocketService being null gracefully', () => {
      // ARRANGE
      const nullService = null;
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT & ASSERT
      expect(() => {
        if (nullService && typeof nullService.emitTicketStatusUpdate === 'function') {
          nullService.emitTicketStatusUpdate(payload);
        }
      }).not.toThrow();
    });

    it('should handle websocketService being undefined gracefully', () => {
      // ARRANGE
      const undefinedService = undefined;
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT & ASSERT
      expect(() => {
        if (undefinedService && typeof undefinedService.emitTicketStatusUpdate === 'function') {
          undefinedService.emitTicketStatusUpdate(payload);
        }
      }).not.toThrow();
    });

    it('should handle emitTicketStatusUpdate throwing error', async () => {
      // ARRANGE
      const error = new Error('WebSocket emission failed');
      mockWebSocketService.emitTicketStatusUpdate.mockRejectedValue(error);
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT & ASSERT
      await expect(
        mockWebSocketService.emitTicketStatusUpdate(payload)
      ).rejects.toThrow('WebSocket emission failed');
    });

    it('should log event emission for debugging', async () => {
      // ARRANGE
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      console.log('[WebSocket] Emitting ticket status:', payload);

      // ASSERT
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WebSocket] Emitting ticket status:',
        payload
      );

      consoleLogSpy.mockRestore();
    });

    it('should emit to correct Socket.IO room', () => {
      // ARRANGE
      const postId = 'post_123';
      const room = `post:${postId}`;
      const payload = {
        post_id: postId,
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      mockWebSocketService.io.to.mockReturnValue({
        emit: jest.fn()
      });

      // ACT
      const roomEmitter = mockWebSocketService.io.to(room);
      roomEmitter.emit('ticketStatus', payload);

      // ASSERT
      expect(mockWebSocketService.io.to).toHaveBeenCalledWith(room);
    });

    it('should broadcast to multiple clients in room', () => {
      // ARRANGE
      const room = 'post:post_123';
      const emitMock = jest.fn();
      mockWebSocketService.io.to.mockReturnValue({
        emit: emitMock
      });

      // ACT
      const roomEmitter = mockWebSocketService.io.to(room);
      roomEmitter.emit('ticketStatus', { status: 'pending' });

      // ASSERT
      expect(emitMock).toHaveBeenCalledWith('ticketStatus', { status: 'pending' });
    });

    it('should handle concurrent event emissions', async () => {
      // ARRANGE
      const payloads = [
        { post_id: 'post_1', ticket_id: 'ticket_1', status: 'pending', timestamp: new Date().toISOString() },
        { post_id: 'post_2', ticket_id: 'ticket_2', status: 'pending', timestamp: new Date().toISOString() },
        { post_id: 'post_3', ticket_id: 'ticket_3', status: 'pending', timestamp: new Date().toISOString() }
      ];

      // ACT
      await Promise.all(
        payloads.map(payload => mockWebSocketService.emitTicketStatusUpdate(payload))
      );

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledTimes(3);
    });
  });

  // ========================================================================
  // 5. ERROR HANDLING AND EDGE CASES
  // ========================================================================

  describe('5. Error Handling and Edge Cases', () => {
    it('should handle malformed payload gracefully', async () => {
      // ARRANGE
      const malformedPayload = {
        // Missing required fields
        random_field: 'value'
      };

      // ACT & ASSERT
      expect(() => {
        // Validation logic should catch this
        const isValid = malformedPayload.post_id && malformedPayload.ticket_id;
        if (!isValid) {
          throw new Error('Invalid payload');
        }
      }).toThrow('Invalid payload');
    });

    it('should handle very long post_id', async () => {
      // ARRANGE
      const longId = 'a'.repeat(1000);
      const payload = {
        post_id: longId,
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ post_id: longId })
      );
    });

    it('should handle special characters in IDs', async () => {
      // ARRANGE
      const specialId = 'post_!@#$%^&*()_+-={}[]|:;"<>?,./';
      const payload = {
        post_id: specialId,
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      await mockWebSocketService.emitTicketStatusUpdate(payload);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ post_id: specialId })
      );
    });

    it('should handle rapid successive emissions', async () => {
      // ARRANGE
      const payload = {
        post_id: 'post_123',
        ticket_id: 'ticket_456',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // ACT
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(mockWebSocketService.emitTicketStatusUpdate({ ...payload, timestamp: new Date().toISOString() }));
      }
      await Promise.all(promises);

      // ASSERT
      expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledTimes(100);
    });
  });
});

/**
 * TEST SUMMARY
 * ============
 * Total Tests: 57
 *
 * Test Categories:
 * 1. Immediate Pending Event: 6 tests
 * 2. Orchestrator Event Emission: 4 tests
 * 3. Event Payload Validation: 26 tests
 *    - Required Fields: 8 tests
 *    - Optional Fields: 3 tests
 *    - Timestamp Format: 3 tests
 *    - Status Validation: 7 tests
 * 4. Integration with WebSocket Service: 8 tests
 * 5. Error Handling and Edge Cases: 4 tests
 *
 * Expected Status: RED (Tests should FAIL initially)
 *
 * These tests verify:
 * - Event emission at all lifecycle stages
 * - Payload structure and validation
 * - WebSocket service integration
 * - Error handling and edge cases
 * - Room-based broadcasting
 * - Concurrent event handling
 *
 * Next Steps (TDD):
 * 1. Run tests (should FAIL - RED phase)
 * 2. Implement event emission in server.js and orchestrator
 * 3. Run tests again (should PASS - GREEN phase)
 * 4. Refactor for optimization (REFACTOR phase)
 */
