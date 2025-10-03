import { Context, Next } from 'hono';
import { getFirebaseAuth } from '../config/firebase-config';
import { sendUnauthorized } from '../utils/response';
import { DecodedToken } from '../types/auth';

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return sendUnauthorized(c, 'Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return sendUnauthorized(c, 'Bearer token is required');
    }

    // Verify the Firebase ID token
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Add the decoded token to the context for use in route handlers
    c.set('user', decodedToken as DecodedToken);
    
    await next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return sendUnauthorized(c, 'Token has expired');
    } else if (error.code === 'auth/id-token-revoked') {
      return sendUnauthorized(c, 'Token has been revoked');
    } else if (error.code === 'auth/invalid-id-token') {
      return sendUnauthorized(c, 'Invalid token');
    } else {
      return sendUnauthorized(c, 'Token verification failed');
    }
  }
}

// Helper function to get the current user from context
export function getCurrentUser(c: Context): DecodedToken {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not found in context. Make sure authMiddleware is applied.');
  }
  return user;
}
