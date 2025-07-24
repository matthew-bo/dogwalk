import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authenticateToken } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply authentication and rate limiting to all admin routes
router.use(authenticateToken);
router.use(authRateLimiter);

// Dashboard and system routes
router.get('/dashboard/stats', asyncHandler(AdminController.getDashboardStats));
router.get('/system/health', asyncHandler(AdminController.getSystemHealth));
router.get('/audit/logs', asyncHandler(AdminController.getAuditLogs));
router.post('/system/config', asyncHandler(AdminController.updateSystemConfig));

// Wallet and financial routes
router.get('/wallets/balances', asyncHandler(AdminController.getWalletBalances));
router.get('/transactions/recent', asyncHandler(AdminController.getRecentTransactions));

// Withdrawal management routes
router.get('/withdrawals/pending', asyncHandler(AdminController.getPendingWithdrawals));
router.post('/withdrawals/approve', asyncHandler(AdminController.approveWithdrawal));
router.post('/emergency/stop', asyncHandler(AdminController.emergencyStop));

// User management routes
router.get('/users/management', asyncHandler(AdminController.getUserManagement));

export default router; 