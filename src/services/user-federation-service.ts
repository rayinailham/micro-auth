import { UserRecord } from 'firebase-admin/auth';
import { userRepository, User, CreateUserInput, UpdateUserInput } from '../repositories/user-repository';
import { getFirebaseAuth } from '../config/firebase-config';

/**
 * User Federation Service
 * Handles synchronization between Firebase Auth and PostgreSQL
 */
export class UserFederationService {
  /**
   * Lazy user creation: Create user in PostgreSQL if not exists
   * This is called when a Firebase user first accesses the system
   */
  async getOrCreateUser(firebaseUser: UserRecord): Promise<User> {
    try {
      // Try to find existing user by Firebase UID
      let user = await userRepository.findByFirebaseUid(firebaseUser.uid);

      if (user) {
        // User exists, sync data and return
        return await this.syncUserFromFirebase(user, firebaseUser);
      }

      // Check if user exists by email (migration case)
      user = await userRepository.findByEmail(firebaseUser.email || '');

      if (user) {
        // User exists with same email, link Firebase UID
        return await this.linkFirebaseToExistingUser(user, firebaseUser);
      }

      // User doesn't exist, create new user
      return await this.createUserFromFirebase(firebaseUser);
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  }

  /**
   * Create a new user in PostgreSQL from Firebase user data
   */
  private async createUserFromFirebase(firebaseUser: UserRecord): Promise<User> {
    try {
      // Generate unique username from display name or email
      let username = firebaseUser.displayName;
      if (!username) {
        // Use email prefix if no display name
        username = firebaseUser.email?.split('@')[0] || null;
      }

      // If username exists, append Firebase UID suffix to make it unique
      if (username) {
        // Take first 6 characters of Firebase UID as suffix
        const suffix = firebaseUser.uid.substring(0, 6);
        username = `${username}_${suffix}`;
      }

      const input: CreateUserInput = {
        email: firebaseUser.email || '',
        username: username,
        firebase_uid: firebaseUser.uid,
        auth_provider: 'firebase',
        provider_data: {
          email_verified: firebaseUser.emailVerified,
          photo_url: firebaseUser.photoURL,
          phone_number: firebaseUser.phoneNumber,
          disabled: firebaseUser.disabled,
          provider_id: firebaseUser.providerData[0]?.providerId,
          creation_time: firebaseUser.metadata.creationTime,
          last_sign_in_time: firebaseUser.metadata.lastSignInTime,
        },
        token_balance: 3, // Default token balance for new users
      };

      const user = await userRepository.createUser(input);

      // Update last_firebase_sync
      await userRepository.updateUser(user.id, {
        last_firebase_sync: new Date(),
        federation_status: 'active',
      });

      console.log(`✅ Created new user from Firebase: ${user.email} (${user.id})`);

      return user;
    } catch (error) {
      console.error('Error creating user from Firebase:', error);

      // Mark federation as failed
      throw error;
    }
  }

  /**
   * Link Firebase UID to existing PostgreSQL user
   * This handles migration from local auth to Firebase auth
   */
  private async linkFirebaseToExistingUser(
    user: User,
    firebaseUser: UserRecord
  ): Promise<User> {
    try {
      const updateInput: UpdateUserInput = {
        firebase_uid: firebaseUser.uid,
        auth_provider: user.auth_provider === 'local' ? 'hybrid' : 'firebase',
        provider_data: {
          email_verified: firebaseUser.emailVerified,
          photo_url: firebaseUser.photoURL,
          phone_number: firebaseUser.phoneNumber,
          disabled: firebaseUser.disabled,
          provider_id: firebaseUser.providerData[0]?.providerId,
          creation_time: firebaseUser.metadata.creationTime,
          last_sign_in_time: firebaseUser.metadata.lastSignInTime,
        },
        last_firebase_sync: new Date(),
        federation_status: 'active',
      };

      const updatedUser = await userRepository.updateUser(user.id, updateInput);

      console.log(`✅ Linked Firebase UID to existing user: ${user.email} (${user.id})`);

      return updatedUser!;
    } catch (error) {
      console.error('Error linking Firebase to existing user:', error);
      
      // Mark federation as failed
      await userRepository.updateUser(user.id, {
        federation_status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Sync user data from Firebase to PostgreSQL
   * Updates user information if it has changed
   */
  async syncUserFromFirebase(user: User, firebaseUser: UserRecord): Promise<User> {
    try {
      // Check if sync is needed (last sync > 5 minutes ago)
      const now = new Date();
      const lastSync = user.last_firebase_sync ? new Date(user.last_firebase_sync) : null;
      const syncThreshold = 5 * 60 * 1000; // 5 minutes

      if (lastSync && (now.getTime() - lastSync.getTime()) < syncThreshold) {
        // No sync needed, return existing user
        return user;
      }

      // Prepare update data
      const updateInput: UpdateUserInput = {
        provider_data: {
          email_verified: firebaseUser.emailVerified,
          photo_url: firebaseUser.photoURL,
          phone_number: firebaseUser.phoneNumber,
          disabled: firebaseUser.disabled,
          provider_id: firebaseUser.providerData[0]?.providerId,
          last_sign_in_time: firebaseUser.metadata.lastSignInTime,
        },
        last_firebase_sync: now,
        last_login: now,
      };

      // Update display name if changed
      if (firebaseUser.displayName && firebaseUser.displayName !== user.username) {
        updateInput.username = firebaseUser.displayName;
      }

      // Update email if changed (rare case)
      // Note: Email updates should be handled carefully

      const updatedUser = await userRepository.updateUser(user.id, updateInput);

      console.log(`✅ Synced user from Firebase: ${user.email} (${user.id})`);

      return updatedUser!;
    } catch (error) {
      console.error('Error syncing user from Firebase:', error);
      
      // Mark federation as failed but don't throw - return existing user
      await userRepository.updateUser(user.id, {
        federation_status: 'failed',
      });

      return user;
    }
  }

  /**
   * Sync user data from PostgreSQL to Firebase
   * This is less common but useful for admin updates
   */
  async syncUserToFirebase(user: User): Promise<void> {
    try {
      if (!user.firebase_uid) {
        throw new Error('User does not have Firebase UID');
      }

      const auth = getFirebaseAuth();

      const updateData: any = {};

      if (user.username) {
        updateData.displayName = user.username;
      }

      if (user.email) {
        updateData.email = user.email;
      }

      // Update Firebase user
      await auth.updateUser(user.firebase_uid, updateData);

      // Update last_firebase_sync
      await userRepository.updateUser(user.id, {
        last_firebase_sync: new Date(),
      });

      console.log(`✅ Synced user to Firebase: ${user.email} (${user.id})`);
    } catch (error) {
      console.error('Error syncing user to Firebase:', error);
      throw error;
    }
  }

  /**
   * Retry failed federations
   * This can be run periodically to fix sync issues
   */
  async retryFailedFederations(): Promise<{ success: number; failed: number }> {
    try {
      const failedUsers = await userRepository.findFailedFederations();
      let successCount = 0;
      let failedCount = 0;

      for (const user of failedUsers) {
        try {
          if (!user.firebase_uid) {
            console.log(`⚠️  User ${user.email} has no Firebase UID, skipping`);
            failedCount++;
            continue;
          }

          const auth = getFirebaseAuth();
          const firebaseUser = await auth.getUser(user.firebase_uid);

          await this.syncUserFromFirebase(user, firebaseUser);

          // Mark as active
          await userRepository.updateUser(user.id, {
            federation_status: 'active',
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to retry federation for user ${user.email}:`, error);
          failedCount++;
        }
      }

      console.log(`✅ Retry failed federations: ${successCount} success, ${failedCount} failed`);

      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Error retrying failed federations:', error);
      throw error;
    }
  }

  /**
   * Get user by Firebase UID with lazy creation
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const firebaseUser = await auth.getUser(firebaseUid);

      return await this.getOrCreateUser(firebaseUser);
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      throw error;
    }
  }

  /**
   * Delete user from both Firebase and PostgreSQL
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Delete from Firebase if linked
      if (user.firebase_uid) {
        try {
          const auth = getFirebaseAuth();
          await auth.deleteUser(user.firebase_uid);
          console.log(`✅ Deleted user from Firebase: ${user.firebase_uid}`);
        } catch (error) {
          console.error('Error deleting user from Firebase:', error);
          // Continue with PostgreSQL deletion even if Firebase deletion fails
        }
      }

      // Soft delete from PostgreSQL
      await userRepository.softDeleteUser(userId);

      console.log(`✅ Deleted user from PostgreSQL: ${user.email} (${userId})`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userFederationService = new UserFederationService();

