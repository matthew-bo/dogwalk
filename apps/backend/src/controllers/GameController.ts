import { Response } from 'express';
import Joi from 'joi';
import { GameService } from '@/services/GameService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, GAME_CONFIG } from 'shared';

export class GameController {
  private static startGameSchema = Joi.object({
    betAmount: Joi.number().integer().min(GAME_CONFIG.MIN_BET_CENTS).max(GAME_CONFIG.MAX_BET_CENTS).required()
  });

  private static cashOutSchema = Joi.object({
    sessionId: Joi.string().uuid().required(),
    cashoutSecond: Joi.number().integer().min(1).max(GAME_CONFIG.MAX_GAME_DURATION).required()
  });

  private static historySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  });

  public static async startGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = GameController.startGameSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Start game validation failed', {
        details: error.details
      });
    }

    const { betAmount } = value;
    const userId = req.user.userId;

    const session = await GameService.startGame(userId, betAmount);

    res.status(201).json({
      success: true,
      data: session,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async cashOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = GameController.cashOutSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Cash out validation failed', {
        details: error.details
      });
    }

    const { sessionId, cashoutSecond } = value;
    const userId = req.user.userId;

    const result = await GameService.cashOut(userId, sessionId, cashoutSecond);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getGameHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = GameController.historySchema.validate(req.query);
    
    if (error) {
      ErrorHandler.throwValidationError('Game history validation failed', {
        details: error.details
      });
    }

    const { limit, offset } = value;
    const userId = req.user.userId;

    const history = await GameService.getGameHistory(userId, limit, offset);

    res.json({
      success: true,
      data: history,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user.userId;
    const activeSessions = await GameService.getActiveSessions(userId);

    res.json({
      success: true,
      data: {
        activeSessions,
        hasActiveSession: activeSessions.length > 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async verifyGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;

    if (!sessionId) {
      ErrorHandler.throwValidationError('Session ID is required');
    }

    const verification = await GameService.verifyGame(sessionId);

    res.json({
      success: true,
      data: verification,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
} 