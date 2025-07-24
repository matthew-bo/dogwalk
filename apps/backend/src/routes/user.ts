import { Router } from 'express';
import { UserController } from '@/controllers/UserController';
import { authenticateToken } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// User routes
router.get('/profile', asyncHandler(UserController.getProfile));
router.put('/profile', asyncHandler(UserController.updateProfile));
router.get('/cosmetics', asyncHandler(UserController.getCosmetics));
router.get('/leaderboard', asyncHandler(UserController.getLeaderboard));

export default router; 