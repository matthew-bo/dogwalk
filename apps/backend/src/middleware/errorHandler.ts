import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import * as Joi from 'joi';
import { ValidationError as JoiValidationError } from 'joi';
import { BusinessError, AuthError, ValidationError, ERROR_CODES, AuthenticatedRequest } from 'shared';

interface APIError {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  };
  meta: {
    timestamp: string;
    requestId?: string;
    user?: string | null;
  };
}

interface CustomError extends Error {
  code?: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error caught by middleware:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: (req as AuthenticatedRequest).user || null
  });

  const response: APIError = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string,
      user: (req as AuthenticatedRequest).user?.userId || null
    }
  };

  // Business Logic Errors
  if (error instanceof BusinessError) {
    response.error = {
      message: error.message,
      code: error.code || ERROR_CODES.BUSINESS_ERROR,
      statusCode: 400,
      ...(error.details && { details: error.details })
    };
  }
  // Authentication Errors
  else if (error instanceof AuthError) {
    response.error = {
      message: error.message,
      code: error.code || ERROR_CODES.TOKEN_INVALID,
      statusCode: 401,
      ...(error.details && { details: error.details })
    };
  }
  // Validation Errors (Custom)
  else if (error instanceof ValidationError) {
    response.error = {
      message: error.message,
      code: error.code || ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      ...(error.details && { details: error.details })
    };
  }
  // Joi Validation Errors
  else if (error instanceof JoiValidationError) {
    response.error = {
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      details: {
        validationErrors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      }
    };
  }
  // Prisma Database Errors
  else if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
    const dbError = ErrorHandler.handleDatabaseError(error);
    response.error = dbError.error;
  }
  // Rate Limiting Errors
  else if (error.statusCode === 429) {
    response.error = {
      message: error.message || 'Too many requests',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      statusCode: 429,
      ...(error.retryAfter && { details: { retryAfter: error.retryAfter } })
    };
  }
  // Generic HTTP Errors
  else if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    response.error = {
      message: error.message || 'Client error',
      code: (error as CustomError).code || 'CLIENT_ERROR',
      statusCode: error.statusCode
    };
  }
  // Unknown Errors
  else {
    const details = process.env.NODE_ENV === 'production' ? undefined : { stack: error.stack };
    response.error = {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Unknown error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      ...(details && { details })
    };
  }

  res.status(response.error.statusCode).json(response);
};

export class ErrorHandler {
  public static throwBusinessError(message: string, code?: string, details?: Record<string, any>): never {
    throw new BusinessError(message, code, details);
  }

  public static throwAuthError(message: string, code?: string, details?: Record<string, any>): never {
    throw new AuthError(message, code, details);
  }

  public static throwValidationError(message: string, details?: Record<string, any>): never {
    throw new ValidationError(message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  public static handleDatabaseError(error: any): APIError {
    console.error('Database error:', error);

    // Handle Prisma errors by code
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
      let message = 'Database operation failed';
      let statusCode = 500;
      let errorCode: string = ERROR_CODES.SYSTEM_ERROR;

      switch (error.code) {
        case 'P2002':
          message = 'Resource already exists';
          errorCode = ERROR_CODES.USER_ALREADY_EXISTS;
          statusCode = 409;
          break;
        case 'P2025':
          message = 'Resource not found';
          errorCode = ERROR_CODES.USER_NOT_FOUND;
          statusCode = 404;
          break;
        default:
          message = 'Database error';
          statusCode = 500;
      }

      return {
        success: false,
        error: {
          message,
          code: errorCode,
          statusCode,
          ...(error.meta && { details: { prismaCode: error.code, target: error.meta.target } })
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    }

    // Handle other database errors
    switch (error.code) {
      case 'ECONNREFUSED':
        return {
          success: false,
          error: {
            message: 'Database connection failed',
            code: ERROR_CODES.SYSTEM_ERROR,
            statusCode: 503
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        };
      case 'ETIMEDOUT':
        return {
          success: false,
          error: {
            message: 'Database timeout',
            code: ERROR_CODES.SYSTEM_ERROR,
            statusCode: 504
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        };
      default:
        return {
          success: false,
          error: {
            message: 'Database error',
            code: ERROR_CODES.SYSTEM_ERROR,
            statusCode: 500
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        };
    }
  }
} 