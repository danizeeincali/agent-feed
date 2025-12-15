import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/database/connection';
import { JWTPayload, User, AppError } from '@/types';
import { logger, securityLogger } from '@/utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: JWTPayload;
    }
  }
}

const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

export class AuthService {
  // Generate JWT access token
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      payload as any, 
      JWT_SECRET as string, 
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'agent-feed',
        audience: 'agent-feed-users'
      } as any
    );
  }

  // Generate refresh token
  static generateRefreshToken(): string {
    return jwt.sign(
      { type: 'refresh', timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` }
    );
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401);
      }
      throw new AppError('Token verification failed', 401);
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
    return bcrypt.hash(password, rounds);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Create user session
  static async createUserSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, refreshToken, expiresAt, userAgent, ipAddress]
    );
  }

  // Validate refresh token
  static async validateRefreshToken(refreshToken: string): Promise<User | null> {
    try {
      const result = await db.query(
        `SELECT u.*, us.expires_at
         FROM users u
         JOIN user_sessions us ON u.id = us.user_id
         WHERE us.refresh_token = $1 AND us.expires_at > NOW()`,
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update last used timestamp
      await db.query(
        'UPDATE user_sessions SET last_used = NOW() WHERE refresh_token = $1',
        [refreshToken]
      );

      return result.rows[0] as User;
    } catch (error) {
      logger.error('Refresh token validation error:', error);
      return null;
    }
  }

  // Revoke refresh token
  static async revokeRefreshToken(refreshToken: string): Promise<void> {
    await db.query(
      'DELETE FROM user_sessions WHERE refresh_token = $1',
      [refreshToken]
    );
  }

  // Revoke all user sessions
  static async revokeAllUserSessions(userId: string): Promise<void> {
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      return null;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      logger.error('Get user by email error:', error);
      return null;
    }
  }

  // Create user
  static async createUser(userData: {
    email: string;
    name: string;
    password?: string;
    claude_user_id?: string;
    avatar_url?: string;
  }): Promise<User> {
    const { email, name, password, claude_user_id, avatar_url } = userData;
    
    let password_hash: string | undefined;
    if (password) {
      password_hash = await this.hashPassword(password);
    }

    try {
      const result = await db.query(
        `INSERT INTO users (email, name, password_hash, claude_user_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [email, name, password_hash, claude_user_id, avatar_url]
      );

      return result.rows[0] as User;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError('User already exists', 409);
      }
      logger.error('Create user error:', error);
      throw new AppError('Failed to create user', 500);
    }
  }

  // Update user last login
  static async updateLastLogin(userId: string): Promise<void> {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }
}

// Middleware to authenticate JWT tokens
export const authenticateToken = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError('Access token required', 401);
    }

    const payload = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(payload.user_id);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: { message: error.message }
      });
    } else {
      logger.error('Authentication middleware error:', error);
      res.status(401).json({
        error: { message: 'Authentication failed' }
      });
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = AuthService.verifyToken(token);
      const user = await AuthService.getUserById(payload.user_id);
      
      if (user) {
        req.user = user;
        req.tokenPayload = payload;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Middleware to check if user is admin (placeholder for future roles)
export const requireAdmin = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: { message: 'Authentication required' }
    });
    return;
  }

  // For now, check if user email contains 'admin' (replace with proper role system)
  if (!req.user.email.includes('admin')) {
    res.status(403).json({
      error: { message: 'Admin access required' }
    });
    return;
  }

  next();
};

// Rate limiting helper
export const createRateLimitKey = (req: Request): string => {
  const userId = req.user?.id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
};

// Login endpoint handler
export const loginHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    const user = await AuthService.getUserByEmail(email);
    if (!user || !user.password_hash) {
      securityLogger.authFailure(email, 'password', req.ip, 'user_not_found');
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      securityLogger.authFailure(email, 'password', req.ip, 'invalid_password');
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = AuthService.generateAccessToken({
      user_id: user.id,
      email: user.email
    });
    const refreshToken = AuthService.generateRefreshToken();

    // Create session
    await AuthService.createUserSession(
      user.id,
      refreshToken,
      req.get('User-Agent'),
      req.ip
    );

    // Update last login
    await AuthService.updateLastLogin(user.id);

    securityLogger.authSuccess(user.id, 'password', req.ip);

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: JWT_EXPIRES_IN,
        token_type: 'Bearer' as const,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        }
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: { message: error.message }
      });
    } else {
      logger.error('Login error:', error);
      res.status(500).json({
        error: { message: 'Internal server error' }
      });
    }
  }
};

// Refresh token endpoint handler
export const refreshTokenHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError('Refresh token required', 400);
    }

    const user = await AuthService.validateRefreshToken(refresh_token);
    if (!user) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new access token
    const accessToken = AuthService.generateAccessToken({
      user_id: user.id,
      email: user.email
    });

    securityLogger.tokenRefresh(user.id, req.ip);

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        expires_in: JWT_EXPIRES_IN,
        token_type: 'Bearer'
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: { message: error.message }
      });
    } else {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        error: { message: 'Internal server error' }
      });
    }
  }
};

// Logout endpoint handler
export const logoutHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      await AuthService.revokeRefreshToken(refresh_token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: { message: 'Internal server error' }
    });
  }
};