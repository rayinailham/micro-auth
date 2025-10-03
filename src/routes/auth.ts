import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getFirebaseAuth, FIREBASE_AUTH_ENDPOINTS } from '../config/firebase-config';
import { authMiddleware, getCurrentUser } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  deleteUserSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../schemas/auth';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendInternalError
} from '../utils/response';
import { handleFirebaseError, handleValidationError, handleGenericError } from '../utils/errors';
import { RegisterRequest, LoginRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest } from '../types/auth';

const auth = new Hono();

// POST /v1/auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { email, password, displayName, photoURL } = c.req.valid('json') as RegisterRequest;

    // Create user with Firebase Auth REST API
    const signUpResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signUp, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      return handleFirebaseError(c, signUpData.error);
    }

    // Update user profile if displayName or photoURL provided
    const firebaseAuth = getFirebaseAuth();
    const userRecord = await firebaseAuth.getUser(signUpData.localId);
    
    if (displayName || photoURL) {
      await firebaseAuth.updateUser(signUpData.localId, {
        displayName,
        photoURL,
      });
    }

    const response: AuthResponse = {
      uid: signUpData.localId,
      email: signUpData.email,
      displayName: displayName || userRecord.displayName,
      photoURL: photoURL || userRecord.photoURL,
      idToken: signUpData.idToken,
      refreshToken: signUpData.refreshToken,
      expiresIn: signUpData.expiresIn,
      createdAt: new Date().toISOString(),
    };

    return sendCreated(c, response, 'User registered successfully');
  } catch (error: any) {
    console.error('Register error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json') as LoginRequest;

    // Sign in with Firebase Auth REST API
    const signInResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signIn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const signInData = await signInResponse.json();

    if (!signInResponse.ok) {
      return handleFirebaseError(c, signInData.error);
    }

    // Get user details from Firebase Admin
    const firebaseAuth = getFirebaseAuth();
    const userRecord = await firebaseAuth.getUser(signInData.localId);

    const response: AuthResponse = {
      uid: signInData.localId,
      email: signInData.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      idToken: signInData.idToken,
      refreshToken: signInData.refreshToken,
      expiresIn: signInData.expiresIn,
    };

    return sendSuccess(c, response, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/refresh
auth.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json');

    // Refresh token with Firebase Auth REST API
    const refreshResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.refreshToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      return handleFirebaseError(c, refreshData.error);
    }

    const response = {
      idToken: refreshData.id_token,
      refreshToken: refreshData.refresh_token,
      expiresIn: refreshData.expires_in,
    };

    return sendSuccess(c, response, 'Token refreshed successfully');
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/logout (protected)
auth.post('/logout', authMiddleware, zValidator('json', logoutSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json');
    const user = getCurrentUser(c);

    // Revoke refresh tokens for the user
    const firebaseAuth = getFirebaseAuth();
    await firebaseAuth.revokeRefreshTokens(user.uid);

    return sendSuccess(c, null, 'Logout successful');
  } catch (error: any) {
    console.error('Logout error:', error);
    return handleGenericError(c, error);
  }
});

// PATCH /v1/auth/profile (protected)
auth.patch('/profile', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
  try {
    const { displayName, photoURL } = c.req.valid('json');
    const user = getCurrentUser(c);

    // Update user profile
    const firebaseAuth = getFirebaseAuth();
    const updateData: any = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (photoURL !== undefined) {
      updateData.photoURL = photoURL;
    }

    await firebaseAuth.updateUser(user.uid, updateData);

    // Get updated user record
    const updatedUser = await firebaseAuth.getUser(user.uid);

    const response: AuthResponse = {
      uid: updatedUser.uid,
      email: updatedUser.email!,
      displayName: updatedUser.displayName,
      photoURL: updatedUser.photoURL,
      updatedAt: new Date().toISOString(),
    };

    return sendSuccess(c, response, 'Profile updated successfully');
  } catch (error: any) {
    console.error('Update profile error:', error);
    return handleGenericError(c, error);
  }
});

// DELETE /v1/auth/user (protected)
auth.delete('/user', authMiddleware, zValidator('json', deleteUserSchema), async (c) => {
  try {
    const { password } = c.req.valid('json');
    const user = getCurrentUser(c);

    // Verify password by attempting to sign in
    const firebaseAuth = getFirebaseAuth();
    const userRecord = await firebaseAuth.getUser(user.uid);

    if (!userRecord.email) {
      return sendBadRequest(c, 'User email not found');
    }

    // Verify password with Firebase Auth REST API
    const signInResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signIn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userRecord.email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!signInResponse.ok) {
      return sendUnauthorized(c, 'Incorrect password');
    }

    // Delete the user account
    await firebaseAuth.deleteUser(user.uid);

    return sendSuccess(c, null, 'User deleted successfully');
  } catch (error: any) {
    console.error('Delete user error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/forgot-password
auth.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  try {
    const { email } = c.req.valid('json') as ForgotPasswordRequest;

    // Send password reset email using Firebase Auth REST API
    const resetResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.sendPasswordResetEmail, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    });

    const resetData = await resetResponse.json();

    if (!resetResponse.ok) {
      return handleFirebaseError(c, resetData.error);
    }

    return sendSuccess(c, null, 'Password reset email sent successfully');
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/reset-password
auth.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  try {
    const { oobCode, newPassword } = c.req.valid('json') as ResetPasswordRequest;

    // Reset password using Firebase Auth REST API
    const resetResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.resetPassword, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oobCode,
        newPassword,
      }),
    });

    const resetData = await resetResponse.json();

    if (!resetResponse.ok) {
      return handleFirebaseError(c, resetData.error);
    }

    return sendSuccess(c, null, 'Password reset successfully');
  } catch (error: any) {
    console.error('Reset password error:', error);
    return handleGenericError(c, error);
  }
});

export default auth;
