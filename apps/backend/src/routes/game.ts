import { Router } from 'express';
import { GameController } from '@/controllers/GameController';
import { authenticateToken } from '@/middleware/auth';
import { gameRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply authentication to all game routes
router.use(authenticateToken);

// Apply game-specific rate limiting
router.use(gameRateLimiter);

// Game routes
router.post('/start', asyncHandler(GameController.startGame));
router.post('/cashout', asyncHandler(GameController.cashOut));
router.get('/history', asyncHandler(GameController.getGameHistory));
router.get('/active-sessions', asyncHandler(GameController.getActiveSessions));
router.get('/verify/:sessionId', asyncHandler(GameController.verifyGame));

export default router; 