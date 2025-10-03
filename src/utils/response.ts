import { Context } from 'hono';
import { ApiResponse } from '../types/auth';

export function createSuccessResponse<T>(
  data: T,
  message: string = 'Operation successful'
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    message: 'Operation failed',
    timestamp: new Date().toISOString()
  };
}

export function sendSuccess<T>(
  c: Context,
  data: T,
  message: string = 'Operation successful',
  status: number = 200
) {
  return c.json(createSuccessResponse(data, message), status);
}

export function sendError(
  c: Context,
  code: string,
  message: string,
  status: number = 400,
  details?: any
) {
  return c.json(createErrorResponse(code, message, details), status);
}

export function sendCreated<T>(
  c: Context,
  data: T,
  message: string = 'Resource created successfully'
) {
  return sendSuccess(c, data, message, 201);
}

export function sendBadRequest(
  c: Context,
  message: string = 'Bad request',
  details?: any
) {
  return sendError(c, 'BAD_REQUEST', message, 400, details);
}

export function sendUnauthorized(
  c: Context,
  message: string = 'Unauthorized'
) {
  return sendError(c, 'UNAUTHORIZED', message, 401);
}

export function sendForbidden(
  c: Context,
  message: string = 'Forbidden'
) {
  return sendError(c, 'FORBIDDEN', message, 403);
}

export function sendNotFound(
  c: Context,
  message: string = 'Resource not found'
) {
  return sendError(c, 'NOT_FOUND', message, 404);
}

export function sendConflict(
  c: Context,
  message: string = 'Resource already exists'
) {
  return sendError(c, 'CONFLICT', message, 409);
}

export function sendInternalError(
  c: Context,
  message: string = 'Internal server error'
) {
  return sendError(c, 'INTERNAL_ERROR', message, 500);
}
