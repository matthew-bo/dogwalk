import { Response } from 'express';
import Joi from 'joi';
import { AdminService } from '@/services/AdminService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from 'shared';

export class AdminController {
  private static adminActionSchema = Joi.object({
    action: Joi.string().required(),
    targetId: Joi.string().uuid().optional(),
    reason: Joi.string().optional()
  });

  private static userSearchSchema = Joi.object({
    search: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(50)
  });

  /**
   * Check if user has admin privileges
   */
  private static async validateAdminAccess(req: AuthenticatedRequest): Promise<void> {
    const userId = req.user.userId;
    
    // Simple admin check - in production, implement proper role system
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    const user = await require('@/services/DatabaseService').prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user || !adminEmails.includes(user.email)) {
      ErrorHandler.throwAuthError('Admin access required', 'ADMIN_ACCESS_DENIED');
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const stats = await AdminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined
      }
    });
  }

  /**
   * Get wallet balances and liquidity information
   */
  public static async getWalletBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const balances = await AdminService.getWalletBalances();

    res.json({
      success: true,
      data: balances,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined
      }
    });
  }

  /**
   * Get recent transactions for monitoring
   */
  public static async getRecentTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await AdminService.getRecentTransactions(limit);

    res.json({
      success: true,
      data: transactions,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        count: transactions.length
      }
    });
  }

  /**
   * Get pending withdrawals requiring approval
   */
  public static async getPendingWithdrawals(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const withdrawals = await AdminService.getPendingWithdrawals();

    res.json({
      success: true,
      data: withdrawals,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        count: withdrawals.length
      }
    });
  }

  /**
   * Approve a pending withdrawal
   */
  public static async approveWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const { error, value } = AdminController.adminActionSchema.validate(req.body);
    if (error) {
      ErrorHandler.throwValidationError('Invalid admin action', { details: error.details });
    }

    const { targetId: withdrawalId } = value;
    const adminUserId = req.user.userId;

    await AdminService.approveWithdrawal(withdrawalId, adminUserId);

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        adminUserId,
        withdrawalId
      }
    });
  }

  /**
   * Emergency stop all withdrawals
   */
  public static async emergencyStop(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const adminUserId = req.user.userId;
    await AdminService.emergencyStopWithdrawals(adminUserId);

    res.json({
      success: true,
      message: 'Emergency withdrawal stop activated',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        adminUserId
      }
    });
  }

  /**
   * Get user management data
   */
  public static async getUserManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const { error, value } = AdminController.userSearchSchema.validate(req.query);
    if (error) {
      ErrorHandler.throwValidationError('Invalid search parameters', { details: error.details });
    }

    const { search, limit } = value;
    const users = await AdminService.getUserManagement(limit, search);

    res.json({
      success: true,
      data: users,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        count: users.length,
        search: search || null
      }
    });
  }

  /**
   * Get system health status
   */
  public static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV
    };

    res.json({
      success: true,
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined
      }
    });
  }

  /**
   * Get audit logs for compliance
   */
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;

    const whereClause: any = {};
    if (action) {
      whereClause.action = action;
    }

    const auditLogs = await require('@/services/DatabaseService').prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { username: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: auditLogs,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined,
        count: auditLogs.length
      }
    });
  }

  /**
   * Update system configuration
   */
  public static async updateSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    await AdminController.validateAdminAccess(req);

    // For now, just log the configuration change
    // In production, implement proper configuration management
    console.log('System configuration update requested:', req.body);

    res.json({
      success: true,
      message: 'Configuration update logged',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('x-request-id') || undefined
      }
    });
  }
} 