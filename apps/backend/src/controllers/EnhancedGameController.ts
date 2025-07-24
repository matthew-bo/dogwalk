import { Response } from 'express';
import Joi from 'joi';
import { EnhancedGameService } from '@/services/EnhancedGameService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, GAME_CONFIG } from 'shared';

export class EnhancedGameController {
  private static startGameSchema = Joi.object({
    betAmount: Joi.number().integer().min(GAME_CONFIG.MIN_BET_CENTS).max(GAME_CONFIG.MAX_BET_CENTS).required()
  });

  private static eventChoiceSchema = Joi.object({
    sessionId: Joi.string().uuid().required(),
    eventType: Joi.string().valid('mini_bonus', 'fetch_opportunity', 'butterfly_chase', 'safe_zone', 'double_down').required(),
    choice: Joi.string().valid('accept', 'decline', 'use_powerup').required(),
    currentSecond: Joi.number().integer().min(1).max(GAME_CONFIG.MAX_GAME_DURATION).required()
  });

  private static cashOutSchema = Joi.object({
    sessionId: Joi.string().uuid().required(),
    cashoutSecond: Joi.number().integer().min(1).max(GAME_CONFIG.MAX_GAME_DURATION).required()
  });

  public static async startEnhancedGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = EnhancedGameController.startGameSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Enhanced game start validation failed', {
        details: error.details
      });
    }

    const { betAmount } = value;
    const userId = req.user.userId;

    const session = await EnhancedGameService.startEnhancedGame(userId, betAmount);

    res.status(201).json({
      success: true,
      data: session,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        gameVersion: 'enhanced'
      }
    });
  }

  public static async handleEventChoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = EnhancedGameController.eventChoiceSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Event choice validation failed', {
        details: error.details
      });
    }

    const { sessionId, eventType, choice, currentSecond } = value;
    const userId = req.user.userId;

    const result = await EnhancedGameService.handleEventChoice(
      userId, 
      sessionId, 
      eventType, 
      choice, 
      currentSecond
    );

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async enhancedCashOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = EnhancedGameController.cashOutSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Enhanced cash out validation failed', {
        details: error.details
      });
    }

    const { sessionId, cashoutSecond } = value;
    const userId = req.user.userId;

    const result = await EnhancedGameService.enhancedCashOut(userId, sessionId, cashoutSecond);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getGameState(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;

    if (!sessionId) {
      ErrorHandler.throwValidationError('Session ID is required');
    }

    const gameState = await EnhancedGameService.getEnhancedGameState(sessionId);

    res.json({
      success: true,
      data: gameState,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getMiniGameEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Predefined mini-game events configuration
    const miniGameEvents = [
      {
        id: 'bonus_treat',
        type: 'bonus_treat',
        title: '🦴 Found a Treat!',
        description: 'Your dog spotted a delicious treat on the path!',
        riskDescription: 'Stopping to eat might attract attention...',
        rewardDescription: '+20% payout multiplier if successful',
        acceptAction: 'Let dog grab the treat',
        declineAction: 'Keep walking safely',
        timeLimit: 8,
        successProbability: 0.7,
        successReward: { type: 'multiplier_bonus', value: 1.2 },
        failurePenalty: { type: 'risk_increase', value: 1.3 }
      },
      {
        id: 'butterfly_chase',
        type: 'butterfly_chase',
        title: '🦋 Butterfly Spotted!',
        description: 'A beautiful butterfly catches your dog\'s attention!',
        riskDescription: 'Chasing might lead to unexpected areas...',
        rewardDescription: 'Tap quickly to catch it for bonus multiplier!',
        acceptAction: 'Chase the butterfly',
        declineAction: 'Stay focused on walking',
        timeLimit: 5,
        successProbability: 0.6,
        successReward: { type: 'multiplier_bonus', value: 1.5 },
        failurePenalty: { type: 'risk_increase', value: 1.4 }
      },
      {
        id: 'fetch_game',
        type: 'fetch_game',
        title: '🎾 Tennis Ball Appears!',
        description: 'Someone dropped a tennis ball nearby!',
        riskDescription: 'Fetch mode doubles squirrel risk but increases rewards',
        rewardDescription: '+50% payout rate for 5 seconds',
        acceptAction: 'Enter fetch mode',
        declineAction: 'Ignore the ball',
        timeLimit: 10,
        successProbability: 1.0, // Always succeeds, but has built-in risk
        successReward: { type: 'multiplier_bonus', value: 1.5 },
        failurePenalty: { type: 'risk_increase', value: 2.0 }
      }
    ];

    res.json({
      success: true,
      data: { events: miniGameEvents },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getProgressiveJackpot(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Mock progressive jackpot data - in production this would be stored in database
    const jackpot = {
      id: 'main_jackpot',
      currentAmount: 15000, // $150.00
      triggerProbability: 0.05,
      minimumWalkTime: 15,
      lastWinner: {
        username: 'LuckyWalker',
        amount: 12500,
        timestamp: new Date(Date.now() - 86400000) // 24 hours ago
      }
    };

    res.json({
      success: true,
      data: jackpot,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async useLeashSlack(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    if (!sessionId) {
      ErrorHandler.throwValidationError('Session ID is required');
    }

    const result = await EnhancedGameService.handleEventChoice(
      userId, 
      sessionId, 
      'leash_slack', 
      'use_powerup', 
      0 // Immediate use
    );

    res.json({
      success: true,
      data: {
        ...result,
        message: 'Leash Slack used! You survived one squirrel event, but risk increases!'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
} 