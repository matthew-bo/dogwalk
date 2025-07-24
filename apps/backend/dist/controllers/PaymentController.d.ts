import { Response } from 'express';
import { AuthenticatedRequest } from 'shared';
export declare class PaymentController {
    private static depositSchema;
    private static withdrawSchema;
    private static transactionHistorySchema;
    static createDeposit(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getTransactions(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getBalance(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=PaymentController.d.ts.map