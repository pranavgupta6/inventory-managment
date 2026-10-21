import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, ApiError } from '../types/index.js';
import { env } from '../config/index.js';

// ---------------------------------------------------------------------------
// Custom application error class
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class LarkIntegrationError extends AppError {
  constructor(message: string, code = 'LARK_INTEGRATION_ERROR') {
    super(message, 503, code);
  }
}

// ---------------------------------------------------------------------------
// Centralized error-handling middleware
// ---------------------------------------------------------------------------

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    const errorBody: ApiError = {
      code: err.code,
      message: err.message,
      ...(isDev && { details: { stack: err.stack } }),
    };

    const response: ApiResponse<never> = { success: false, error: errorBody };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown / unhandled errors — do not leak internals
  console.error('Unhandled error:', err);

  const errorBody: ApiError = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
    ...(isDev && {
      details: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    }),
  };

  const response: ApiResponse<never> = { success: false, error: errorBody };
  res.status(500).json(response);
}

// ---------------------------------------------------------------------------
// 404 handler — must be registered after all routes
// ---------------------------------------------------------------------------

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };
  res.status(404).json(response);
}
