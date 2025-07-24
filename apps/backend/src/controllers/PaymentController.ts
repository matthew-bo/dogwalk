import { Response } from 'express';
import Joi from 'joi';
import { PaymentService } from '@/services/PaymentService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from 'shared';

export class PaymentController {
  private static depositSchema = Joi.object({
    currency: Joi.string().valid('BTC', 'ETH').required(),
    userId: Joi.string().uuid().required()
  });

  private static withdrawSchema = Joi.object({
    currency: Joi.string().valid('BTC', 'ETH').required(),
    address: Joi.string().required(),
    usdAmount: Joi.number().min(10).max(100000).required(),
    userId: Joi.string().uuid().required()
  });

  private static transactionHistorySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    type: Joi.string().valid('deposit', 'withdrawal', 'bet', 'payout').optional()
  });

  public static async getCryptoPrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prices = await PaymentService.getCryptoPrices();
      
      res.json({
        success: true,
        data: prices,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error: any) {
      ErrorHandler.throwBusinessError('Failed to fetch crypto prices', 'PRICE_FETCH_ERROR');
    }
  }

  public static async createDepositAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = PaymentController.depositSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Deposit validation failed', {
        details: error.details
      });
    }

    const { currency, userId } = value;
    
    // Verify the user making the request matches the userId
    if (req.user.userId !== userId) {
      ErrorHandler.throwBusinessError('Unauthorized access', 'AUTH_ERROR');
    }

    const depositData = await PaymentService.createDepositAddress(userId, currency);

    res.status(201).json({
      success: true,
      data: depositData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async createWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = PaymentController.withdrawSchema.validate(req.body);
    
    if (error) {
      ErrorHandler.throwValidationError('Withdrawal validation failed', {
        details: error.details
      });
    }

    const { currency, address, usdAmount, userId } = value;
    
    // Verify the user making the request matches the userId
    if (req.user.userId !== userId) {
      ErrorHandler.throwBusinessError('Unauthorized access', 'AUTH_ERROR');
    }

    const withdrawal = await PaymentService.createWithdrawal(userId, Math.round(usdAmount * 100), address, currency.toLowerCase());

    res.status(201).json({
      success: true,
      data: withdrawal,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { error, value } = PaymentController.transactionHistorySchema.validate(req.query);
    
    if (error) {
      ErrorHandler.throwValidationError('Transaction history validation failed', {
        details: error.details
      });
    }

    const { limit, offset, type } = value;
    const userId = req.user.userId;

    const transactions = await PaymentService.getTransactionHistory(userId, limit, offset, type);

    res.json({
      success: true,
      data: transactions,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }

  public static async getBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user.userId;
    const balance = await PaymentService.getUserBalance(userId);

    res.json({
      success: true,
      data: balance,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  }
} 