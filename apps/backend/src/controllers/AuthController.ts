import { Request, Response } from 'express';
import Joi from 'joi';
import { AuthService } from '@/services/AuthService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from 'shared';

export class AuthController {
  private static registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }),
    ageConfirmed: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'You must confirm that you are 21 years or older'
      })
  });

  private static loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  private static refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
  });

  public static async register(req: Request, res: Response): Promise<void> {
    const { error, value } = AuthController.registerSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Registration validation failed', {
        details: error.details
      });
    }

    const { username, email, password, ageConfirmed } = value;

    const result = await AuthService.register({
      username,
      email,
      password,
      ageConfirmed
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async login(req: Request, res: Response): Promise<void> {
    const { error, value } = AuthController.loginSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Login validation failed', {
        details: error.details
      });
    }

    const { username, password } = value;

    const result = await AuthService.login(username, password);

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      ErrorHandler.throwAuthError('No token provided for logout');
    }

    await AuthService.logout(token);

    res.json({
      success: true,
      data: {
        message: 'Successfully logged out'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async refreshToken(req: Request, res: Response): Promise<void> {
    const { error, value } = AuthController.refreshTokenSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Refresh token validation failed', {
        details: error.details
      });
    }

    const { refreshToken } = value;

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        token: result.token,
        refreshToken: result.refreshToken
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await AuthService.getCurrentUser(req.user.userId);

    res.json({
      success: true,
      data: {
        user
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
} 