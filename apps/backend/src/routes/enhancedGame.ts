import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { gameRateLimiter, apiRateLimiter } from '@/middleware/rateLimiter';
import { EnhancedGameController } from '@/controllers/EnhancedGameController';

const router = Router();

// Apply authentication to all enhanced game routes
router.use(authenticateToken);

// Enhanced game management
router.post(
  '/start', 
  gameRateLimiter,
  EnhancedGameController.startEnhancedGame
);

router.post(
  '/event-choice',
  gameRateLimiter,
  EnhancedGameController.handleEventChoice
);

router.post(
  '/cashout',
  gameRateLimiter,
  EnhancedGameController.enhancedCashOut
);

router.get(
  '/state/:sessionId',
  apiRateLimiter,
  EnhancedGameController.getGameState
);

// Mini-game configurations
router.get(
  '/mini-games',
  apiRateLimiter,
  EnhancedGameController.getMiniGameEvents
);

// Progressive jackpot
router.get(
  '/jackpot',
  apiRateLimiter,
  EnhancedGameController.getProgressiveJackpot
);

// Power-ups
router.post(
  '/use-leash-slack',
  gameRateLimiter,
  EnhancedGameController.useLeashSlack
);

export { router as enhancedGameRoutes }; 