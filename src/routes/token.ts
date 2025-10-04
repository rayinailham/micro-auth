import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getFirebaseAuth } from '../config/firebase-config';
import { verifyTokenSchema } from '../schemas/auth';
import { sendSuccess, sendUnauthorized, sendInternalError } from '../utils/response';
import { handleFirebaseError, handleGenericError } from '../utils/errors';
import { userFederationService } from '../services/user-federation-service';
import { getCachedTokenVerification, cacheTokenVerification } from '../config/redis-config';

const token = new Hono();

/**
 * POST /v1/token/verify
 * Verify Firebase ID token and return user data
 * This endpoint is used by other services to verify tokens
 */
token.post('/verify', zValidator('json', verifyTokenSchema), async (c) => {
  try {
    const { token: idToken } = c.req.valid('json');

    // Check cache first
    const cached = await getCachedTokenVerification(idToken);
    if (cached) {
      console.log('✅ Token verification from cache');
      return sendSuccess(c, cached, 'Token verified from cache');
    }

    // Verify token with Firebase
    const auth = getFirebaseAuth();
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return sendUnauthorized(c, 'Invalid or expired token');
    }

    // Get or create user in PostgreSQL (lazy creation)
    let firebaseUser;
    try {
      firebaseUser = await auth.getUser(decodedToken.uid);
    } catch (error: any) {
      console.error('Failed to get Firebase user:', error);
      return sendUnauthorized(c, 'User not found in Firebase');
    }

    // Lazy user creation/sync
    let user;
    try {
      user = await userFederationService.getOrCreateUser(firebaseUser);
    } catch (error: any) {
      console.error('Failed to get or create user:', error);
      return sendInternalError(c, 'Failed to sync user data');
    }

    // Prepare response data
    const responseData = {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        user_type: user.user_type,
        is_active: user.is_active,
        token_balance: user.token_balance,
        firebase_uid: user.firebase_uid,
        auth_provider: user.auth_provider,
        email_verified: firebaseUser.emailVerified,
        photo_url: firebaseUser.photoURL,
      },
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: firebaseUser.emailVerified,
      tokenExpiration: decodedToken.exp,
      issuedAt: decodedToken.iat,
    };

    // Cache the verification result (5 minutes TTL)
    await cacheTokenVerification(idToken, responseData, 300);

    console.log(`✅ Token verified for user: ${user.email} (${user.id})`);

    return sendSuccess(c, responseData, 'Token verified successfully');
  } catch (error: any) {
    console.error('Token verification error:', error);
    return handleGenericError(c, error);
  }
});

/**
 * POST /v1/token/verify-header
 * Verify token from Authorization header
 * Convenience endpoint for services that send token in header
 */
token.post('/verify-header', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(c, 'Missing or invalid Authorization header');
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check cache first
    const cached = await getCachedTokenVerification(idToken);
    if (cached) {
      console.log('✅ Token verification from cache (header)');
      return sendSuccess(c, cached, 'Token verified from cache');
    }

    // Verify token with Firebase
    const auth = getFirebaseAuth();
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return sendUnauthorized(c, 'Invalid or expired token');
    }

    // Get or create user in PostgreSQL (lazy creation)
    let firebaseUser;
    try {
      firebaseUser = await auth.getUser(decodedToken.uid);
    } catch (error: any) {
      console.error('Failed to get Firebase user:', error);
      return sendUnauthorized(c, 'User not found in Firebase');
    }

    // Lazy user creation/sync
    let user;
    try {
      user = await userFederationService.getOrCreateUser(firebaseUser);
    } catch (error: any) {
      console.error('Failed to get or create user:', error);
      return sendInternalError(c, 'Failed to sync user data');
    }

    // Prepare response data
    const responseData = {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        user_type: user.user_type,
        is_active: user.is_active,
        token_balance: user.token_balance,
        firebase_uid: user.firebase_uid,
        auth_provider: user.auth_provider,
        email_verified: firebaseUser.emailVerified,
        photo_url: firebaseUser.photoURL,
      },
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: firebaseUser.emailVerified,
      tokenExpiration: decodedToken.exp,
      issuedAt: decodedToken.iat,
    };

    // Cache the verification result (5 minutes TTL)
    await cacheTokenVerification(idToken, responseData, 300);

    console.log(`✅ Token verified for user: ${user.email} (${user.id})`);

    return sendSuccess(c, responseData, 'Token verified successfully');
  } catch (error: any) {
    console.error('Token verification error:', error);
    return handleGenericError(c, error);
  }
});

/**
 * GET /v1/token/health
 * Health check for token verification service
 */
token.get('/health', (c) => {
  return sendSuccess(c, {
    status: 'healthy',
    service: 'token-verification',
    timestamp: new Date().toISOString(),
  }, 'Token verification service is healthy');
});

export default token;

