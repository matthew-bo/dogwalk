import { Router } from 'express';
import { WebhookController } from '@/controllers/WebhookController';
import { webhookRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Apply rate limiting
router.use(webhookRateLimiter);

// Webhook routes
router.post('/coinbase', asyncHandler(WebhookController.handleCoinbaseWebhook));

export default router; 