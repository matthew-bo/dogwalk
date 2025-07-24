import { Router } from 'express';
import { PaymentController } from '@/controllers/PaymentController';
import { authenticateToken } from '@/middleware/auth';
import { paymentRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply authentication and rate limiting
router.use(authenticateToken);
router.use(paymentRateLimiter);

// Payment routes
router.get('/prices', asyncHandler(PaymentController.getCryptoPrices));
router.post('/deposit', asyncHandler(PaymentController.createDepositAddress));
router.post('/withdraw', asyncHandler(PaymentController.createWithdrawal));
router.get('/transactions', asyncHandler(PaymentController.getTransactions));
router.get('/balance', asyncHandler(PaymentController.getBalance));

export default router; 