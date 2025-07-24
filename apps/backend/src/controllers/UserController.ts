import { Response } from 'express';
import Joi from 'joi';
import { UserService } from '@/services/UserService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from 'shared';

export class UserController {
  private static updateProfileSchema = Joi.object({
    email: Joi.string().email().optional(),
    currentPassword: Joi.string().min(8).when('newPassword', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      })
  });

  private static leaderboardSchema = Joi.object({
    period: Joi.string().valid('daily', 'weekly', 'all-time').default('daily'),
    limit: Joi.number().integer().min(1).max(100).default(10)
  });

  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user.userId;
    const profile = await UserService.getUserProfile(userId);

    res.json({
      success: true,
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = UserController.updateProfileSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Profile update validation failed', {
        details: error.details
      });
    }

    const userId = req.user.userId;
    const updatedProfile = await UserService.updateUserProfile(userId, value);

    res.json({
      success: true,
      data: updatedProfile,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getCosmetics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user.userId;
    const cosmetics = await UserService.getUserCosmetics(userId);

    res.json({
      success: true,
      data: cosmetics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = UserController.leaderboardSchema.validate(req.query);
    
    if (error) {
      ErrorHandler.throwValidationError('Leaderboard validation failed', {
        details: error.details
      });
    }

    const { period, limit } = value;
    const leaderboard = await UserService.getLeaderboard(period, limit);

    res.json({
      success: true,
      data: leaderboard,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
} 