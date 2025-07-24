import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authenticateToken } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply rate limiting to auth endpoints
router.use(authRateLimiter);

// Public routes
router.post('/register', asyncHandler(AuthController.register));
router.post('/login', asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refreshToken));

// Protected routes
router.post('/logout', authenticateToken, asyncHandler(AuthController.logout));
router.get('/me', authenticateToken, asyncHandler(AuthController.getCurrentUser));

export default router; 