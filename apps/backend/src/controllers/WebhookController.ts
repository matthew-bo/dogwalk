import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from '@/services/PaymentService';
import { ErrorHandler } from '@/middleware/errorHandler';

export class WebhookController {
  public static async handleCoinbaseWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature
      const signature = req.headers['x-cc-webhook-signature'] as string;
      const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('COINBASE_WEBHOOK_SECRET not configured');
        res.status(500).json({
          success: false,
          error: { message: 'Webhook secret not configured' }
        });
        return;
      }

      // Verify the webhook signature
      if (signature) {
        const computedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== computedSignature) {
          console.error('Invalid webhook signature');
          res.status(401).json({
            success: false,
            error: { message: 'Invalid signature' }
          });
          return;
        }
      }

      // Process the webhook
      await PaymentService.handleCoinbaseWebhook(req.body);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('Error processing Coinbase webhook:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Failed to process webhook'
        }
      });
    }
  }
} 