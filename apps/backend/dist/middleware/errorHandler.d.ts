import { Request, Response, NextFunction } from 'express';
export declare class ErrorHandler {
    static handle(error: Error, req: Request, res: Response, next: NextFunction): void;
    private static formatError;
    private static handlePrismaError;
    private static getStatusCode;
    static throwBusinessError(message: string, code?: string, details?: Record<string, any>): never;
    static throwAuthError(message: string, code?: string, details?: Record<string, any>): never;
    static throwValidationError(message: string, details?: Record<string, any>): never;
}
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map