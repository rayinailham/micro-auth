import { Context } from 'hono';
import { FirebaseAuthError } from '../types/auth';
import { sendError, sendBadRequest, sendUnauthorized, sendConflict, sendInternalError } from './response';

// Firebase Auth error codes mapping
export const FIREBASE_ERROR_CODES = {
  'auth/email-already-exists': 'AUTH_002',
  'auth/email-already-in-use': 'AUTH_002',
  'auth/invalid-email': 'AUTH_007',
  'auth/weak-password': 'AUTH_006',
  'auth/user-not-found': 'AUTH_005',
  'auth/wrong-password': 'AUTH_001',
  'auth/invalid-credential': 'AUTH_001',
  'auth/user-disabled': 'AUTH_001',
  'auth/too-many-requests': 'RATE_LIMIT_EXCEEDED',
  'auth/id-token-expired': 'AUTH_004',
  'auth/id-token-revoked': 'AUTH_003',
  'auth/invalid-id-token': 'AUTH_003',
  'auth/argument-error': 'AUTH_003',
  'auth/invalid-refresh-token': 'AUTH_003'
} as const;

export const AUTH_ERROR_MESSAGES = {
  'AUTH_001': 'Invalid credentials',
  'AUTH_002': 'Email already exists',
  'AUTH_003': 'Invalid token',
  'AUTH_004': 'Token expired',
  'AUTH_005': 'User not found',
  'AUTH_006': 'Password is too weak',
  'AUTH_007': 'Invalid email format',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.'
} as const;

export function mapFirebaseError(firebaseError: any): { code: string; message: string; status: number } {
  const errorCode = firebaseError.code || firebaseError.errorInfo?.code;
  
  if (!errorCode) {
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      status: 500
    };
  }

  const mappedCode = FIREBASE_ERROR_CODES[errorCode as keyof typeof FIREBASE_ERROR_CODES];
  const message = AUTH_ERROR_MESSAGES[mappedCode as keyof typeof AUTH_ERROR_MESSAGES] || firebaseError.message;

  // Determine HTTP status code based on error type
  let status = 400;
  if (mappedCode === 'AUTH_001' || mappedCode === 'AUTH_003' || mappedCode === 'AUTH_004') {
    status = 401;
  } else if (mappedCode === 'AUTH_002') {
    status = 409;
  } else if (mappedCode === 'RATE_LIMIT_EXCEEDED') {
    status = 429;
  }

  return {
    code: mappedCode || 'UNKNOWN_ERROR',
    message,
    status
  };
}

export function handleFirebaseError(c: Context, error: any) {
  console.error('Firebase error:', error);
  
  const { code, message, status } = mapFirebaseError(error);
  
  return sendError(c, code, message, status);
}

export function handleValidationError(c: Context, error: any) {
  console.error('Validation error:', error);
  
  if (error.issues && Array.isArray(error.issues)) {
    const details = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    
    return sendBadRequest(c, 'Validation failed', details);
  }
  
  return sendBadRequest(c, 'Invalid request data');
}

export function handleGenericError(c: Context, error: any) {
  console.error('Generic error:', error);
  
  // Check if it's a known error type
  if (error.code && error.code.startsWith('auth/')) {
    return handleFirebaseError(c, error);
  }
  
  // Default to internal server error
  return sendInternalError(c, 'An unexpected error occurred');
}
