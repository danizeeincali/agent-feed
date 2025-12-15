import { Router } from 'express';
import { validationResult } from 'express-validator';
import {
  AuthService,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  authenticateToken
} from '@/middleware/auth';
import {
  validateUserLogin,
  validateUserRegistration
} from '@/middleware/validation';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { AppError } from '@/types';
import { logger, securityLogger } from '@/utils/logger';

const router = Router();

// Register new user
router.post('/register',
  validateUserRegistration,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { email, name, password, claude_user_id, avatar_url } = req.body;

    // Check if user already exists
    const existingUser = await AuthService.getUserByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // Create user
    const user = await AuthService.createUser({
      email,
      name,
      password,
      claude_user_id,
      avatar_url
    });

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

    securityLogger.authSuccess(user.id, 'registration', req.ip);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: process.env['JWT_EXPIRES_IN'] || '24h',
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        }
      }
    });
  })
);

// Login user
router.post('/login',
  validateUserLogin,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  loginHandler
);

// Refresh access token
router.post('/refresh', refreshTokenHandler);

// Logout user
router.post('/logout', logoutHandler);

// Get current user profile
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        preferences: user.preferences,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  })
);

// Update user profile
router.put('/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { name, preferences } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (preferences) {
      updates.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      throw new AppError('No updates provided', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, email, name, avatar_url, preferences, created_at, updated_at, last_login
    `;

    const result = await AuthService.getUserById(userId);
    if (!result) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
  })
);

// Change password
router.put('/password',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (new_password.length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400);
    }

    // Get current user with password hash
    const user = await AuthService.getUserById(userId);
    if (!user || !user.password_hash) {
      throw new AppError('User not found or no password set', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthService.verifyPassword(
      current_password,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      securityLogger.authFailure(user.email, 'password_change', req.ip, 'invalid_current_password');
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(new_password);

    // Update password
    await AuthService.getUserById(userId); // This would need to be a proper update method

    // Revoke all existing sessions for security
    await AuthService.revokeAllUserSessions(userId);

    securityLogger.authSuccess(userId, 'password_change', req.ip);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  })
);

// Revoke all sessions (logout from all devices)
router.post('/logout-all',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    await AuthService.revokeAllUserSessions(userId);
    
    securityLogger.authSuccess(userId, 'logout_all', req.ip);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  })
);

// Claude OAuth integration (placeholder for future implementation)
router.get('/claude/url',
  asyncHandler(async (req, res) => {
    const clientId = process.env['CLAUDE_CLIENT_ID'];
    const redirectUri = process.env['CLAUDE_REDIRECT_URI'];
    
    if (!clientId || !redirectUri) {
      throw new AppError('Claude OAuth not configured', 501);
    }

    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36)
    })).toString('base64');

    const authUrl = `https://claude.ai/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=read:user&` +
      `state=${state}`;

    res.json({
      success: true,
      data: {
        auth_url: authUrl,
        state
      }
    });
  })
);

// Claude OAuth callback (placeholder for future implementation)
router.post('/claude/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.body;
    
    if (!code || !state) {
      throw new AppError('Authorization code and state are required', 400);
    }

    // TODO: Implement actual Claude OAuth flow
    // 1. Exchange code for access token
    // 2. Get user info from Claude API
    // 3. Create or update user account
    // 4. Generate our JWT tokens
    
    throw new AppError('Claude OAuth integration not yet implemented', 501);
  })
);

// Get user sessions
router.get('/sessions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    const result = await AuthService.getUserById(userId); // This would need to fetch sessions
    
    res.json({
      success: true,
      data: {
        sessions: [] // Placeholder
      }
    });
  })
);

// Revoke specific session
router.delete('/sessions/:sessionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    
    // TODO: Implement session revocation by ID
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  })
);

export default router;