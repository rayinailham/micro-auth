import { getFirebaseAuth, FIREBASE_AUTH_ENDPOINTS } from '../config/firebase-config';
import { UserRepository } from '../repositories/user-repository';
import * as crypto from 'crypto';

/**
 * Forgot Password Service
 * Handles hybrid forgot password logic for both local and Firebase users
 */
export class ForgotPasswordService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Process forgot password request with automatic migration for local users
   * 
   * @param email - User's email address
   * @returns Object with success status and message
   */
  async processForgotPassword(email: string): Promise<{
    success: boolean;
    message: string;
    migrated?: boolean;
    error?: string;
  }> {
    try {
      console.log(`🔐 Processing forgot password for: ${email}`);

      // STEP 1: Check if user exists in PostgreSQL
      const pgUser = await this.userRepository.findByEmail(email);

      if (!pgUser) {
        console.log(`⚠️ User not found in PostgreSQL: ${email}`);
        // Security best practice: Don't reveal if email exists or not
        // Return success message anyway
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        };
      }

      console.log(`✅ User found in PostgreSQL: ${pgUser.id} (auth_provider: ${pgUser.auth_provider}, firebase_uid: ${pgUser.firebase_uid ? 'exists' : 'null'})`);

      // STEP 2: Determine user type and handle accordingly
      if (pgUser.firebase_uid) {
        // Case A: User has Firebase UID (Firebase or Hybrid user)
        console.log(`📧 Sending password reset email via Firebase for existing Firebase user`);
        return await this.sendFirebasePasswordResetEmail(email);
      } else {
        // Case B: Local user without Firebase UID - needs migration
        console.log(`🚀 Local user detected, starting automatic migration...`);
        return await this.migrateAndResetPassword(email, pgUser);
      }

    } catch (error: any) {
      console.error(`❌ Forgot password error for ${email}:`, error);
      
      // Don't expose internal errors to user for security
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        error: error.message,
      };
    }
  }

  /**
   * Send password reset email via Firebase for existing Firebase users
   */
  private async sendFirebasePasswordResetEmail(email: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
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
        console.error(`❌ Firebase password reset failed:`, resetData.error);
        
        // If email not found in Firebase, this shouldn't happen for hybrid users
        // but handle it gracefully
        if (resetData.error?.message === 'EMAIL_NOT_FOUND') {
          console.error(`⚠️ Inconsistency detected: User has firebase_uid but not found in Firebase`);
        }
        
        return {
          success: false,
          message: 'Failed to send password reset email',
          error: resetData.error?.message,
        };
      }

      console.log(`✅ Password reset email sent successfully via Firebase`);
      return {
        success: true,
        message: 'Password reset email sent successfully',
      };

    } catch (error: any) {
      console.error(`❌ Error sending Firebase password reset email:`, error);
      return {
        success: false,
        message: 'Failed to send password reset email',
        error: error.message,
      };
    }
  }

  /**
   * Migrate local user to Firebase and send password reset email
   * This is the core automatic migration logic
   */
  private async migrateAndResetPassword(email: string, pgUser: any): Promise<{
    success: boolean;
    message: string;
    migrated?: boolean;
    error?: string;
  }> {
    const firebaseAuth = getFirebaseAuth();

    try {
      // STEP 1: Check if user already exists in Firebase (race condition protection)
      let firebaseUser;
      let userExistsInFirebase = false;

      try {
        firebaseUser = await firebaseAuth.getUserByEmail(email);
        userExistsInFirebase = true;
        console.log(`⚠️ User already exists in Firebase: ${firebaseUser.uid}`);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        console.log(`✅ User not found in Firebase, proceeding with creation`);
      }

      // STEP 2: Create Firebase user if doesn't exist
      if (!userExistsInFirebase) {
        console.log(`📝 Creating Firebase user with temporary password...`);
        
        // Generate a secure temporary password
        const temporaryPassword = this.generateTemporaryPassword();

        firebaseUser = await firebaseAuth.createUser({
          email: email,
          password: temporaryPassword,
          displayName: pgUser.username || undefined,
          disabled: !pgUser.is_active,
        });

        console.log(`✅ Firebase user created: ${firebaseUser.uid}`);
      }

      // STEP 3: Update PostgreSQL with firebase_uid (atomic operation)
      console.log(`📝 Updating PostgreSQL with firebase_uid...`);
      
      await this.userRepository.updateUser(pgUser.id, {
        firebase_uid: firebaseUser!.uid,
        auth_provider: 'hybrid',
        federation_status: 'active',
        last_firebase_sync: new Date(),
      });

      console.log(`✅ PostgreSQL updated successfully`);

      // STEP 4: Send password reset email
      console.log(`📧 Sending password reset email...`);
      
      const resetResult = await this.sendFirebasePasswordResetEmail(email);

      if (!resetResult.success) {
        // Migration succeeded but email failed - mark as partial success
        console.error(`⚠️ Migration succeeded but password reset email failed`);
        
        // Update federation status to indicate issue
        await this.userRepository.updateUser(pgUser.id, {
          federation_status: 'syncing',
        });

        return {
          success: false,
          message: 'Account migrated but failed to send reset email. Please try again.',
          migrated: true,
          error: resetResult.error,
        };
      }

      console.log(`✅ Migration and password reset completed successfully for: ${email}`);

      return {
        success: true,
        message: 'Account migrated successfully. Password reset email sent.',
        migrated: true,
      };

    } catch (migrationError: any) {
      console.error(`❌ Migration failed for ${email}:`, migrationError);

      // Mark migration as failed in database
      try {
        await this.userRepository.updateUser(pgUser.id, {
          federation_status: 'failed',
          last_firebase_sync: new Date(),
        });
      } catch (updateError) {
        console.error('Failed to update federation_status:', updateError);
      }

      return {
        success: false,
        message: 'Failed to process password reset. Please try again or contact support.',
        migrated: false,
        error: migrationError.message,
      };
    }
  }

  /**
   * Generate a secure temporary password for Firebase user creation
   * This password will be immediately reset via the password reset email
   */
  private generateTemporaryPassword(): string {
    // Generate a cryptographically secure random password
    // Must meet Firebase requirements: at least 6 characters
    const randomBytes = crypto.randomBytes(32);
    const password = randomBytes.toString('base64').slice(0, 32);
    
    console.log(`🔑 Generated temporary password for migration`);
    return password;
  }

  /**
   * Get migration statistics (for monitoring)
   */
  async getMigrationStats(): Promise<{
    totalUsers: number;
    localUsers: number;
    hybridUsers: number;
    firebaseUsers: number;
    failedMigrations: number;
  }> {
    // This would require additional queries to the database
    // Placeholder for future implementation
    return {
      totalUsers: 0,
      localUsers: 0,
      hybridUsers: 0,
      firebaseUsers: 0,
      failedMigrations: 0,
    };
  }
}

// Export singleton instance
export const forgotPasswordService = new ForgotPasswordService();

