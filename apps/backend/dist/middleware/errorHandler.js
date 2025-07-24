"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.ErrorHandler = void 0;
const client_1 = require("@prisma/client");
const joi_1 = require("joi");
const jsonwebtoken_1 = require("jsonwebtoken");
const shared_1 = require("shared");
class ErrorHandler {
    static handle(error, req, res, next) {
        console.error('Error caught by error handler:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: req.body,
            user: req.user || null
        });
        const response = {
            success: false,
            error: ErrorHandler.formatError(error),
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown'
            }
        };
        const statusCode = ErrorHandler.getStatusCode(error);
        res.status(statusCode).json(response);
    }
    static formatError(error) {
        // Business logic errors
        if (error instanceof shared_1.BusinessError) {
            return {
                code: error.code,
                message: error.message,
                details: error.details
            };
        }
        // Authentication errors
        if (error instanceof shared_1.AuthError) {
            return {
                code: error.code,
                message: error.message,
                details: error.details
            };
        }
        // JWT errors
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            return {
                code: 'TOKEN_EXPIRED',
                message: 'Authentication token has expired'
            };
        }
        if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
            return {
                code: 'TOKEN_INVALID',
                message: 'Invalid authentication token'
            };
        }
        // Joi validation errors
        if (error instanceof joi_1.ValidationError) {
            return {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: {
                    validationErrors: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message,
                        value: detail.context?.value
                    }))
                }
            };
        }
        // Prisma errors
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return ErrorHandler.handlePrismaError(error);
        }
        if (error instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
            return {
                code: 'DATABASE_ERROR',
                message: 'Unknown database error occurred'
            };
        }
        if (error instanceof client_1.Prisma.PrismaClientValidationError) {
            return {
                code: 'DATABASE_VALIDATION_ERROR',
                message: 'Database validation error',
                details: { validationError: error.message }
            };
        }
        // Rate limiting errors (from express-rate-limit)
        if (error.message?.includes('Too many requests')) {
            return {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later'
            };
        }
        // Default system error
        return {
            code: 'SYSTEM_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An internal server error occurred'
                : error.message
        };
    }
    static handlePrismaError(error) {
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const target = error.meta?.target || [];
                return {
                    code: 'DUPLICATE_ENTRY',
                    message: `A record with this ${target.join(', ')} already exists`,
                    details: { field: target[0] }
                };
            case 'P2025':
                // Record not found
                return {
                    code: 'RECORD_NOT_FOUND',
                    message: 'The requested record was not found'
                };
            case 'P2003':
                // Foreign key constraint violation
                return {
                    code: 'FOREIGN_KEY_VIOLATION',
                    message: 'This operation violates a foreign key constraint'
                };
            case 'P2014':
                // Invalid ID
                return {
                    code: 'INVALID_ID',
                    message: 'The provided ID is invalid'
                };
            case 'P2021':
                // Table not found
                return {
                    code: 'TABLE_NOT_FOUND',
                    message: 'Database table not found'
                };
            case 'P2022':
                // Column not found
                return {
                    code: 'COLUMN_NOT_FOUND',
                    message: 'Database column not found'
                };
            default:
                return {
                    code: 'DATABASE_ERROR',
                    message: 'A database error occurred',
                    details: { prismaCode: error.code }
                };
        }
    }
    static getStatusCode(error) {
        // Business logic errors
        if (error instanceof shared_1.BusinessError) {
            switch (error.code) {
                case 'INSUFFICIENT_BALANCE':
                case 'INVALID_BET_AMOUNT':
                case 'GAME_ALREADY_ACTIVE':
                    return 400;
                case 'GAME_SESSION_NOT_FOUND':
                case 'USER_NOT_FOUND':
                    return 404;
                default:
                    return 400;
            }
        }
        // Authentication errors
        if (error instanceof shared_1.AuthError) {
            switch (error.code) {
                case 'INVALID_CREDENTIALS':
                case 'TOKEN_INVALID':
                case 'TOKEN_EXPIRED':
                case 'TOKEN_MISSING':
                    return 401;
                case 'AGE_NOT_VERIFIED':
                case 'INSUFFICIENT_PERMISSIONS':
                    return 403;
                default:
                    return 401;
            }
        }
        // JWT errors
        if (error instanceof jsonwebtoken_1.TokenExpiredError || error instanceof jsonwebtoken_1.JsonWebTokenError) {
            return 401;
        }
        // Validation errors
        if (error instanceof joi_1.ValidationError) {
            return 400;
        }
        // Prisma errors
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2002': // Unique constraint
                    return 409;
                case 'P2025': // Record not found
                    return 404;
                case 'P2003': // Foreign key violation
                case 'P2014': // Invalid ID
                    return 400;
                default:
                    return 500;
            }
        }
        // Rate limiting
        if (error.message?.includes('Too many requests')) {
            return 429;
        }
        // Default to 500 for unknown errors
        return 500;
    }
    // Helper method for controllers to throw formatted errors
    static throwBusinessError(message, code, details) {
        throw new shared_1.BusinessError(message, code, details);
    }
    static throwAuthError(message, code, details) {
        throw new shared_1.AuthError(message, code, details);
    }
    static throwValidationError(message, details) {
        const error = new Error(message);
        error.name = 'ValidationError';
        error.details = details;
        throw error;
    }
}
exports.ErrorHandler = ErrorHandler;
// Async error wrapper for controllers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map