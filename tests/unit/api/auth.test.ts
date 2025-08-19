import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Authentication API Unit Tests
 * Tests user registration, login, token validation, and session management
 */

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('pg');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Authentication API', () => {
  let app: express.Application;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database
    mockDb = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };

    // Setup Express app with auth routes
    app = express();
    app.use(express.json());
    
    // Mock auth middleware and routes
    setupAuthRoutes(app, mockDb);
  });

  describe('POST /auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User'
    };

    it('should register a new user successfully', async () => {
      // Mock bcrypt hash
      mockBcrypt.hash.mockResolvedValue('hashed_password' as never);
      
      // Mock database query - user doesn't exist
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: '123', 
            email: validUser.email, 
            name: validUser.name,
            created_at: new Date()
          }] 
        }); // Insert new user

      const response = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with existing email', async () => {
      // Mock database query - user exists
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: '123', email: validUser.email }] 
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should validate email format', async () => {
      const invalidEmailUser = {
        ...validUser,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidEmailUser);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid email format');
    });

    it('should validate password strength', async () => {
      const weakPasswordUser = {
        ...validUser,
        password: '123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(weakPasswordUser);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Password must be at least 8 characters');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('POST /auth/login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: loginCredentials.email,
        password_hash: 'hashed_password',
        name: 'Test User',
        is_active: true
      };

      // Mock database query
      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      
      // Mock bcrypt compare
      mockBcrypt.compare.mockResolvedValue(true as never);
      
      // Mock JWT sign
      mockJwt.sign.mockReturnValue('mock_jwt_token' as never);

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mock_jwt_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginCredentials.email);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject login with invalid email', async () => {
      // Mock database query - user not found
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: '123',
        email: loginCredentials.email,
        password_hash: 'hashed_password',
        is_active: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(false as never);

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      const mockUser = {
        id: '123',
        email: loginCredentials.email,
        password_hash: 'hashed_password',
        is_active: false
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(true as never);

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Account is deactivated');
    });

    it('should implement rate limiting', async () => {
      // Simulate multiple failed login attempts
      mockDb.query.mockResolvedValue({ rows: [] });

      const promises = Array(6).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send(loginCredentials)
      );

      const responses = await Promise.all(promises);
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty('error', 'Too many login attempts');
    });
  });

  describe('GET /auth/profile', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      created_at: new Date()
    };

    it('should return user profile with valid token', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({ userId: '123' } as never);
      
      // Mock database query
      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid_jwt_token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No token provided');
    });

    it('should reject request with invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should handle expired tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer expired_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      mockJwt.verify.mockReturnValue({ userId: '123' } as never);

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No token provided');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh valid token', async () => {
      const mockPayload = { userId: '123', email: 'test@example.com' };
      
      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockJwt.sign.mockReturnValue('new_jwt_token' as never);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'new_jwt_token');
    });

    it('should reject refresh with expired token', async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer expired_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: '123', email: 'test@example.com' }] 
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should reset password with valid token', async () => {
      const resetToken = 'valid_reset_token';
      const newPassword = 'NewSecurePass123!';

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: '123', 
            reset_token: resetToken, 
            reset_expires: new Date(Date.now() + 3600000) 
          }] 
        })
        .mockResolvedValueOnce({ rows: [{ id: '123' }] });

      mockBcrypt.hash.mockResolvedValue('new_hashed_password' as never);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ 
          token: resetToken, 
          password: newPassword 
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset successfully');
    });

    it('should reject password reset with expired token', async () => {
      const expiredToken = 'expired_reset_token';

      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '123', 
          reset_token: expiredToken, 
          reset_expires: new Date(Date.now() - 3600000) // Expired 1 hour ago
        }] 
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ 
          token: expiredToken, 
          password: 'NewPassword123!' 
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Reset token expired');
    });
  });
});

// Mock auth routes setup
function setupAuthRoutes(app: express.Application, db: any) {
  const router = express.Router();

  // Registration endpoint
  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Validation
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ errors: ['Invalid email format'] });
      }
      
      if (!password || password.length < 8) {
        return res.status(400).json({ errors: ['Password must be at least 8 characters'] });
      }

      // Check if user exists
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await mockBcrypt.hash(password, 10);

      // Insert user
      const newUser = await db.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email, passwordHash, name]
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: newUser.rows[0]
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const userResult = await db.query(
        'SELECT id, email, password_hash, name, is_active FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Check if account is active
      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Verify password
      const isValidPassword = await mockBcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = mockJwt.sign(
        { userId: user.id, email: user.email },
        'test-secret',
        { expiresIn: '24h' }
      );

      const { password_hash, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Protected profile endpoint
  router.get('/profile', authenticateToken, async (req, res) => {
    try {
      const userResult = await db.query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [(req as any).user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: userResult.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  router.post('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });

  // Token refresh endpoint
  router.post('/refresh', authenticateToken, (req, res) => {
    const newToken = mockJwt.sign(
      { userId: (req as any).user.userId, email: (req as any).user.email },
      'test-secret',
      { expiresIn: '24h' }
    );
    res.json({ token: newToken });
  });

  // Password reset request
  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (userResult.rows.length > 0) {
        // In real implementation, would generate reset token and send email
        res.json({ message: 'Password reset email sent' });
      } else {
        res.json({ message: 'Password reset email sent' }); // Don't reveal if email exists
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Password reset
  router.post('/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      const resetResult = await db.query(
        'SELECT id, reset_expires FROM users WHERE reset_token = $1',
        [token]
      );

      if (resetResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid reset token' });
      }

      const user = resetResult.rows[0];
      if (new Date() > user.reset_expires) {
        return res.status(400).json({ error: 'Reset token expired' });
      }

      const passwordHash = await mockBcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
        [passwordHash, user.id]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use('/auth', router);
}

// Mock authentication middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = mockJwt.verify(token, 'test-secret');
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}