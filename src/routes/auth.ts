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
import { userFederationService } from '../services/user-federation-service';
import { UserRepository } from '../repositories/user-repository';
import * as bcrypt from 'bcrypt';

const auth = new Hono();
const userRepository = new UserRepository();

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
    let userRecord = await firebaseAuth.getUser(signUpData.localId);

    if (displayName || photoURL) {
      await firebaseAuth.updateUser(signUpData.localId, {
        displayName,
        photoURL,
      });
      userRecord = await firebaseAuth.getUser(signUpData.localId);
    }

    // Create user in PostgreSQL (lazy creation)
    try {
      const pgUser = await userFederationService.getOrCreateUser(userRecord);
      console.log(`✅ User created in PostgreSQL: ${pgUser.email} (${pgUser.id})`);
    } catch (error) {
      console.error('Failed to create user in PostgreSQL:', error);
      // Don't fail registration if PostgreSQL sync fails
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

    return sendCreated(c, response, 'User registered successfully using auth v2');
  } catch (error: any) {
    console.error('Register error:', error);
    return handleGenericError(c, error);
  }
});

// POST /v1/auth/login - Hybrid Authentication
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json') as LoginRequest;

    console.log(`🔐 Login attempt for: ${email}`);

    // STEP 1: Try Firebase Authentication first
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

    // If Firebase authentication successful, return tokens
    if (signInResponse.ok) {
      console.log(`✅ Firebase authentication successful for: ${email}`);

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

      return sendSuccess(c, response, 'Login successful using auth v2');
    }

    // STEP 2: Check if error is USER_NOT_FOUND (potential local user)
    const errorCode = signInData.error?.message;

    // Check if this could be a local user (user not found in Firebase)
    // Firebase can return EMAIL_NOT_FOUND, INVALID_EMAIL, or INVALID_LOGIN_CREDENTIALS
    const isUserNotFoundError =
      errorCode === 'EMAIL_NOT_FOUND' ||
      errorCode === 'INVALID_EMAIL' ||
      errorCode === 'INVALID_LOGIN_CREDENTIALS';

    if (!isUserNotFoundError) {
      // Other Firebase errors (wrong password for existing Firebase user, disabled account, etc.)
      console.log(`❌ Firebase error: ${errorCode}`);
      return handleFirebaseError(c, signInData.error);
    }

    console.log(`🔍 User not found in Firebase (${errorCode}), checking PostgreSQL...`);

    // STEP 3: Check PostgreSQL for local user
    const localUser = await userRepository.findByEmail(email);

    if (!localUser) {
      console.log(`❌ User not found in PostgreSQL: ${email}`);
      return sendUnauthorized(c, 'Invalid email or password');
    }

    console.log(`✅ Local user found: ${localUser.id} (${localUser.email})`);

    // STEP 4: Verify user has password_hash
    if (!localUser.password_hash) {
      console.log(`❌ User has no password_hash: ${email}`);
      return sendBadRequest(c, 'Password reset required. Please use forgot password.');
    }

    // STEP 5: Verify password with bcrypt
    console.log(`🔐 Verifying password with bcrypt...`);
    const isPasswordValid = await bcrypt.compare(password, localUser.password_hash);

    if (!isPasswordValid) {
      console.log(`❌ Invalid password for: ${email}`);
      return sendUnauthorized(c, 'Invalid email or password');
    }

    console.log(`✅ Password verified for: ${email}`);

    // STEP 6: Migrate user to Firebase
    console.log(`🚀 Starting migration to Firebase for: ${email}`);

    try {
      const firebaseAuth = getFirebaseAuth();

      // Check if user already exists in Firebase (race condition protection)
      let firebaseUser;
      try {
        firebaseUser = await firebaseAuth.getUserByEmail(email);
        console.log(`⚠️ User already exists in Firebase: ${firebaseUser.uid}`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create Firebase user
          console.log(`📝 Creating Firebase user...`);
          firebaseUser = await firebaseAuth.createUser({
            email: email,
            password: password,
            displayName: localUser.username || undefined,
            disabled: !localUser.is_active,
          });
          console.log(`✅ Firebase user created: ${firebaseUser.uid}`);
        } else {
          throw error;
        }
      }

      // Update PostgreSQL with firebase_uid
      console.log(`📝 Updating PostgreSQL with firebase_uid...`);
      await userRepository.updateUser(localUser.id, {
        firebase_uid: firebaseUser.uid,
        auth_provider: 'hybrid',
        federation_status: 'active',
        last_firebase_sync: new Date(),
      });
      console.log(`✅ PostgreSQL updated successfully`);

      // Generate Firebase tokens by signing in
      console.log(`🔑 Generating Firebase tokens...`);
      const tokenResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signIn, {
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

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(`Failed to generate tokens: ${tokenData.error?.message}`);
      }

      console.log(`✅ Migration completed successfully for: ${email}`);

      const response: AuthResponse = {
        uid: firebaseUser.uid,
        email: email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: tokenData.idToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
      };

      return sendSuccess(c, response, 'Login successful - Account migrated to Firebase using auth v2');

    } catch (migrationError: any) {
      console.error(`❌ Migration failed for ${email}:`, migrationError);

      // Mark migration as failed in database
      try {
        await userRepository.updateUser(localUser.id, {
          federation_status: 'failed',
          last_firebase_sync: new Date(),
        });
      } catch (updateError) {
        console.error('Failed to update federation_status:', updateError);
      }

      return sendInternalError(c, 'Migration to Firebase failed. Please try again or contact support.');
    }

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

    return sendSuccess(c, response, 'Token refreshed successfully using auth v2');
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

    return sendSuccess(c, null, 'Logout successful using auth v2');
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

    return sendSuccess(c, response, 'Profile updated successfully using auth v2');
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

    return sendSuccess(c, null, 'User deleted successfully using auth v2');
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

    return sendSuccess(c, null, 'Password reset email sent successfully using auth v2');
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

    return sendSuccess(c, null, 'Password reset successfully using auth v2');
  } catch (error: any) {
    console.error('Reset password error:', error);
    return handleGenericError(c, error);
  }
});

export default auth;
